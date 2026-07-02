import type { Editor } from '@tiptap/core'

export interface TiptapEditorProps {
  content?: Record<string, unknown> | null
  onChange?: (json: Record<string, unknown>, text: string) => void
  editable?: boolean
  trackChangesEnabled?: boolean
  authorName?: string
  onSelectionChange?: (selectedText: string, from: number, to: number) => void
}

export interface ToolbarButton {
  icon: React.ReactNode
  title: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
}

export interface DropdownItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  active?: boolean
  className?: string
}

export const FONT_SIZES = ['9', '10', '11', '12', '14', '16', '18', '22', '24', '30', '36'] as const

export const FONT_FAMILIES = [
  { label: '默认', value: 'Inter, system-ui, sans-serif' },
  { label: '宋体', value: '"SimSun", "宋体", serif' },
  { label: '黑体', value: '"SimHei", "黑体", sans-serif' },
  { label: '楷体', value: '"KaiTi", "楷体", serif' },
  { label: '仿宋', value: '"FangSong", "仿宋", serif' },
  { label: '微软雅黑', value: '"Microsoft YaHei", sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
] as const

export const LINE_HEIGHTS = [
  { label: '1.0', value: '1' },
  { label: '1.15', value: '1.15' },
  { label: '1.5', value: '1.5' },
  { label: '1.8', value: '1.8' },
  { label: '2.0', value: '2' },
  { label: '2.5', value: '2.5' },
  { label: '3.0', value: '3' },
] as const

export const COLOR_PALETTE = [
  '#000000', '#262626', '#595959', '#8C8C8C', '#BFBFBF', '#D9D9D9', '#E8E8E8', '#F5F5F5', '#FAFAFA', '#FFFFFF',
  '#F5222D', '#FA8C16', '#FADB14', '#52C41A', '#13C2C2', '#1890FF', '#722ED1', '#EB2F96', '#FFD666', '#FF85C0',
  '#FFF1F0', '#FFF7E6', '#FEFFE6', '#F6FFED', '#E6FFFB', '#E6F7FF', '#F9F0FF', '#FFF0F6', '#FFFBE6', '#FFE6F0',
  '#FFCCC7', '#FFE7BA', '#FFFB8F', '#B7EB8F', '#87E8DE', '#91D5FF', '#D3ADF7', '#FFADD2', '#FFE58F', '#FFB8D2',
  '#FF7875', '#FFC069', '#FFF566', '#95DE64', '#5CDBD3', '#69C0FF', '#B37FEB', '#FF85C0', '#FFD666', '#FF9EC7',
  '#FF4D4F', '#FFA940', '#FFEC3D', '#73D13D', '#36CFC9', '#40A9FF', '#9254DE', '#F759AB', '#FFC53D', '#FF7AAE',
  '#CF1322', '#D46B08', '#D4B106', '#389E0D', '#08979C', '#096DD9', '#531DAB', '#C41D7F', '#D48806', '#C41D68',
]
