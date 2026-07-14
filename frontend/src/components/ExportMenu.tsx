import { useState } from 'react'
import Button from './ui/Button'
import Menu, { MenuItem } from './ui/Menu'
import {
  downloadAsMarkdown,
  downloadAsHTML,
  downloadAsPDF,
  copyAsMarkdown,
  copyAsHTML,
  type ExportMetadata,
} from '../utils/exportUtils'
import { showErrorToast, showSuccessToast } from '../utils/errorHandler'

interface ExportMenuProps {
  documentation: string
  metadata: ExportMetadata
}

// Export dropdown for a generated document: download or copy as
// Markdown/HTML, or download a print-ready PDF.
function ExportMenu({ documentation, metadata }: ExportMenuProps) {
  const [open, setOpen] = useState<boolean>(false)

  const handleDownload = async (format: 'markdown' | 'html' | 'pdf') => {
    if (!documentation) return

    try {
      if (format === 'markdown') {
        downloadAsMarkdown(documentation, metadata)
        showSuccessToast('Downloaded as Markdown')
      } else if (format === 'html') {
        await downloadAsHTML(documentation, metadata)
        showSuccessToast('Downloaded as HTML')
      } else {
        await downloadAsPDF(documentation, metadata)
        showSuccessToast('Downloaded as PDF')
      }
      setOpen(false)
    } catch (err) {
      showErrorToast(err)
    }
  }

  const handleCopy = async (format: 'markdown' | 'html') => {
    if (!documentation) return

    try {
      if (format === 'markdown') {
        await copyAsMarkdown(documentation, metadata)
        showSuccessToast('Copied as Markdown')
      } else {
        await copyAsHTML(documentation, metadata)
        showSuccessToast('Copied as HTML')
      }
      setOpen(false)
    } catch (err) {
      showErrorToast(err)
    }
  }

  return (
    <span className="relative">
      <Button size="sm" variant="ghost" onClick={() => setOpen(!open)}>
        export ▾
      </Button>
      <Menu open={open} onClose={() => setOpen(false)} align="right">
        <MenuItem onSelect={() => handleDownload('markdown')}>↓ download .md</MenuItem>
        <MenuItem onSelect={() => handleDownload('html')}>↓ download .html</MenuItem>
        <MenuItem onSelect={() => handleDownload('pdf')}>↓ download .pdf</MenuItem>
        <div className="my-1 h-px bg-ink-700" />
        <MenuItem onSelect={() => handleCopy('markdown')}>⧉ copy as markdown</MenuItem>
        <MenuItem onSelect={() => handleCopy('html')}>⧉ copy as html</MenuItem>
      </Menu>
    </span>
  )
}

export default ExportMenu
