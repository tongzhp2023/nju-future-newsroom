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
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import { TextStyleKit } from '@tiptap/extension-text-style'
import { PageBreak, Pagination } from 'tiptap-community-pages'
import { Indent } from '@/lib/tiptap-extensions/indent'
import { Attachment } from '@/lib/tiptap-extensions/attachment'
import { Callout } from '@/lib/tiptap-extensions/callout'
import { SearchReplace } from '@/lib/tiptap-extensions/search-replace'
import { Columns, Column } from '@/lib/tiptap-extensions/column'
import {
  TrackInsert, TrackDelete, TrackChanges, CommentMark,
} from '@/lib/tiptap-extensions/track-changes'
import type { AnyExtension } from '@tiptap/core'

interface ExtensionsConfig {
  trackChangesEnabled: boolean
  authorName: string
}

export function getExtensions({ trackChangesEnabled, authorName }: ExtensionsConfig): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      link: false,
      underline: false,
      // 禁用 StarterKit 内置的 bulletList/orderedList，使用显式导入的版本
      bulletList: false,
      orderedList: false,
      listItem: false,
    }),
    // 显式注册列表扩展，确保正确加载
    BulletList,
    OrderedList,
    ListItem,
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
    TextStyleKit,
    Indent,
    Attachment,
    Callout,
    Columns,
    Column,
    SearchReplace,
    // A4 分页
    PageBreak,
    Pagination.configure({
      pageFormat: 'A4',
      orientation: 'portrait',
      margins: { top: 96, bottom: 96, left: 96, right: 96 },
      pageGap: 40,
      showPageNumbers: false,
    }),
    // 修订模式
    TrackInsert,
    TrackDelete,
    CommentMark,
    TrackChanges.configure({ enabled: trackChangesEnabled, author: authorName }),
  ]
}
