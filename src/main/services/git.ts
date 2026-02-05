import simpleGit, { SimpleGit, StatusResult } from 'simple-git'
import { ChangedFile, DiffContent, FileStatus } from '@shared/types'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { minimatch } from 'minimatch'

export class GitService {
  /**
   * Check if a directory is a git repository.
   */
  private isGitRepo(dir: string): boolean {
    return existsSync(join(dir, '.git'))
  }

  /**
   * Get a SimpleGit instance for a directory.
   */
  private getGit(dir: string): SimpleGit | null {
    if (!this.isGitRepo(dir)) {
      return null
    }
    return simpleGit(dir)
  }

  /**
   * Get patterns from .gitattributes that have diff=lfs (should be excluded from diff view).
   */
  private getLfsPatterns(dir: string): string[] {
    const gitattributesPath = join(dir, '.gitattributes')
    if (!existsSync(gitattributesPath)) {
      return []
    }

    try {
      const content = readFileSync(gitattributesPath, 'utf-8')
      const patterns: string[] = []

      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith('#')) continue

        // Check if line contains diff=lfs
        if (trimmed.includes('diff=lfs')) {
          // Extract the pattern (first part before whitespace)
          const pattern = trimmed.split(/\s+/)[0]
          if (pattern) {
            patterns.push(pattern)
          }
        }
      }

      return patterns
    } catch {
      return []
    }
  }

  /**
   * Check if a file path matches any of the LFS patterns.
   */
  private isLfsFile(filePath: string, lfsPatterns: string[]): boolean {
    return lfsPatterns.some((pattern) => minimatch(filePath, pattern, { matchBase: true }))
  }

  /**
   * Get the current branch name.
   */
  async getCurrentBranch(dir: string): Promise<string | null> {
    const git = this.getGit(dir)
    if (!git) return null

    try {
      const branches = await git.branchLocal()
      return branches.current || null
    } catch (error) {
      console.error('Error getting current branch:', error)
      return null
    }
  }

  /**
   * Detect the main branch (main, master, or default).
   */
  async getMainBranch(dir: string): Promise<string | null> {
    const git = this.getGit(dir)
    if (!git) return null

    try {
      // Try to get the default branch from remote
      const remotes = await git.getRemotes(true)
      if (remotes.length > 0) {
        try {
          const result = await git.raw(['symbolic-ref', 'refs/remotes/origin/HEAD'])
          const match = result.match(/refs\/remotes\/origin\/(.+)/)
          if (match) {
            return match[1].trim()
          }
        } catch {
          // symbolic-ref might fail if HEAD not set
        }
      }

      // Try common branch names
      const branches = await git.branchLocal()
      const commonNames = ['main', 'master', 'develop', 'dev']

      for (const name of commonNames) {
        if (branches.all.includes(name)) {
          return name
        }
      }

      // Return the current branch as fallback
      return branches.current || null
    } catch (error) {
      console.error('Error getting main branch:', error)
      return null
    }
  }

  /**
   * Get list of changed files compared to base branch.
   */
  async getChangedFiles(dir: string, baseBranch?: string): Promise<ChangedFile[]> {
    const git = this.getGit(dir)
    if (!git) return []

    try {
      const base = baseBranch || (await this.getMainBranch(dir))
      const lfsPatterns = this.getLfsPatterns(dir)

      // Get status for working directory changes
      const status: StatusResult = await git.status()
      const files: ChangedFile[] = []

      // Track files we've already added
      const addedPaths = new Set<string>()

      // Add staged files
      for (const file of status.staged) {
        files.push({ path: file, status: this.getStatusFromGit(status, file) })
        addedPaths.add(file)
      }

      // Add modified files (not staged)
      for (const file of status.modified) {
        if (!addedPaths.has(file)) {
          files.push({ path: file, status: 'M' })
          addedPaths.add(file)
        }
      }

      // Add new files
      for (const file of status.not_added) {
        if (!addedPaths.has(file)) {
          files.push({ path: file, status: '?' })
          addedPaths.add(file)
        }
      }

      // Add deleted files
      for (const file of status.deleted) {
        if (!addedPaths.has(file)) {
          files.push({ path: file, status: 'D' })
          addedPaths.add(file)
        }
      }

      // Add created files (staged new files)
      for (const file of status.created) {
        if (!addedPaths.has(file)) {
          files.push({ path: file, status: 'A' })
          addedPaths.add(file)
        }
      }

      // If we have a base branch, also get diff against it
      if (base) {
        try {
          const diffSummary = await git.diffSummary([base, 'HEAD'])
          for (const file of diffSummary.files) {
            if (!addedPaths.has(file.file)) {
              let status: FileStatus = 'M'
              // Check if file has insertions/deletions (text file)
              if ('insertions' in file && 'deletions' in file) {
                if (file.insertions > 0 && file.deletions === 0) {
                  status = 'A'
                } else if (file.deletions > 0 && file.insertions === 0) {
                  status = 'D'
                }
              }
              files.push({ path: file.file, status })
            }
          }
        } catch {
          // Ignore errors getting diff against base
        }
      }

      // Filter out LFS files
      return files.filter((file) => !this.isLfsFile(file.path, lfsPatterns))
    } catch (error) {
      console.error('Error getting changed files:', error)
      return []
    }
  }

  private getStatusFromGit(status: StatusResult, file: string): FileStatus {
    if (status.created.includes(file)) return 'A'
    if (status.deleted.includes(file)) return 'D'
    if (status.renamed.some((r) => r.to === file)) return 'R'
    return 'M'
  }

  /**
   * Get diff content for a specific file.
   */
  async getFileDiff(
    dir: string,
    filePath: string,
    baseBranch?: string
  ): Promise<DiffContent | null> {
    const git = this.getGit(dir)
    if (!git) return null

    try {
      const base = baseBranch || (await this.getMainBranch(dir)) || 'HEAD'

      // Get original content from base
      let original = ''
      try {
        original = await git.show([`${base}:${filePath}`])
      } catch {
        // File might be new, no original content
      }

      // Get modified content from working directory
      let modified = ''
      try {
        const { readFile } = await import('fs/promises')
        modified = await readFile(join(dir, filePath), 'utf-8')
      } catch {
        // File might be deleted
      }

      return { original, modified }
    } catch (error) {
      console.error('Error getting file diff:', error)
      return null
    }
  }

  /**
   * Get file content at a specific ref.
   */
  async getFileContent(
    dir: string,
    filePath: string,
    ref?: string
  ): Promise<string | null> {
    const git = this.getGit(dir)
    if (!git) return null

    try {
      if (ref) {
        return await git.show([`${ref}:${filePath}`])
      } else {
        const { readFile } = await import('fs/promises')
        return await readFile(join(dir, filePath), 'utf-8')
      }
    } catch (error) {
      console.error('Error getting file content:', error)
      return null
    }
  }
}
