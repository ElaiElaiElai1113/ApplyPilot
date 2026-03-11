'use client'

import { Copy, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

export interface FullContentModalProps {
  title: string
  content: string
  fileName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function sanitizeFileName(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9-_ ]+/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'document'
}

export function FullContentModal({
  title,
  content,
  fileName,
  open,
  onOpenChange,
}: FullContentModalProps) {
  const { toast } = useToast()

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content)
      toast({ title: `${title} copied` })
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' })
    }
  }

  function handleDownload() {
    try {
      const safeName = sanitizeFileName(fileName)
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${safeName}.txt`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
      toast({ title: 'TXT downloaded' })
    } catch {
      toast({ title: 'Download failed', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[92vh] max-h-[92vh] w-[95vw] max-w-[95vw] rounded-[1.6rem] border-[#eadfd3] bg-[#fffdf9] p-0 sm:h-[90vh] sm:max-w-[92vw]">
        <DialogHeader className="border-b border-[#efe3d7] px-6 py-4 text-left">
          <DialogTitle className="font-serif text-3xl text-[#56463b]">{title}</DialogTitle>
          <DialogDescription className="text-[#7b6a5d]">Review full content, then copy or download.</DialogDescription>
        </DialogHeader>

        <div className="flex h-full min-h-0 flex-col px-6 pb-6">
          <div className="flex flex-wrap gap-3 py-4">
            <Button variant="ghost" className="rounded-full border border-[#e2d6cb] bg-white/90 text-[#6d5b4f] hover:bg-[#f7f1ea]" onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
            <Button variant="ghost" className="rounded-full border border-[#e2d6cb] bg-white/90 text-[#6d5b4f] hover:bg-[#f7f1ea]" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download TXT
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-[1.2rem] border border-[#efe3d7] bg-[#fff9f3] p-5 whitespace-pre-wrap text-sm leading-8 text-[#66564a]">
            {content}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
