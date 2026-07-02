import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import ImageExtension from '@tiptap/extension-image'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { TextStyleKit } from '@tiptap/extension-text-style'

import { Indent } from '@/lib/tiptap-extensions/indent'
import { Video } from '@/lib/tiptap-extensions/video'
import { Iframe } from '@/lib/tiptap-extensions/iframe'
import { Attachment } from '@/lib/tiptap-extensions/attachment'
import { Callout } from '@/lib/tiptap-extensions/callout'
import { SearchReplace } from '@/lib/tiptap-extensions/search-replace'
import { Columns, Column } from '@/lib/tiptap-extensions/column'
import { TextDirection } from '@/lib/tiptap-extensions/text-direction'
import {
  TrackInsert,
  TrackDelete,
  TrackChanges,
  CommentMark,
} from '@/lib/tiptap-extensions/track-changes'
import type { AnyExtension } from '@tiptap/core'

// TextStyleKit already bundles: TextStyle, Color, BackgroundColor, FontFamily, FontSize, LineHeight

interface ExtensionsConfig {
  trackChangesEnabled: boolean
  authorName: string
}

export function getExtensions({ trackChangesEnabled, authorName }: ExtensionsConfig): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
    }),
    Placeholder.configure({ placeholder: '开始撰写您的稿件...' }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'text-blue-600 underline cursor-pointer' },
    }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Highlight.configure({ multicolor: true }),
    ImageExtension.configure({
      HTMLAttributes: { class: 'max-w-full rounded-lg my-4' },
    }),
    Subscript,
    Superscript,
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,
    // TextStyleKit bundles: TextStyle, Color, BackgroundColor, FontFamily, FontSize, LineHeight
    TextStyleKit,
    Indent,
    Video,
    Iframe,
    Attachment,
    Callout,
    Columns,
    Column,
    TextDirection,
    SearchReplace,
    TrackInsert,
    TrackDelete,
    CommentMark,
    TrackChanges.configure({ enabled: trackChangesEnabled, author: authorName }),
  ]
}
