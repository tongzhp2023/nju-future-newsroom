// ============================================
// 中文字号体系（字号名 → pt 值）
// ============================================
export const FONT_SIZES = [
  { label: '初号', value: '42pt' },
  { label: '小初', value: '36pt' },
  { label: '一号', value: '26pt' },
  { label: '小一', value: '24pt' },
  { label: '二号', value: '22pt' },
  { label: '小二', value: '18pt' },
  { label: '三号', value: '16pt' },
  { label: '小三', value: '15pt' },
  { label: '四号', value: '14pt' },
  { label: '小四', value: '12pt' },
  { label: '五号', value: '10.5pt' },
  { label: '小五', value: '9pt' },
  { label: '六号', value: '7.5pt' },
  { label: '七号', value: '5.5pt' },
  { label: '八号', value: '5pt' },
] as const

// ============================================
// 字体族（系统字体 + WPS 字体）
// ============================================
export const FONT_FAMILIES = [
  { label: '默认', value: '"PingFang SC", "Microsoft YaHei", sans-serif' },
  { label: '宋体', value: '"Songti SC", "宋体", "SimSun", "STSong", serif' },
  { label: '黑体', value: '"STHeiti", "黑体", "SimHei", "Microsoft YaHei", sans-serif' },
  { label: '楷体', value: '"HYKaiTiJ", "KaiTi", "楷体", "STKaiti", "BiauKai", serif' },
  { label: '仿宋', value: '"FangS-SC", "FangSong", "仿宋", "STFangsong", "FangSong_GB2312", serif' },
  { label: '冬青黑体', value: '"Hiragino Sans GB", "冬青黑体简体中文", sans-serif' },
  { label: '汉仪旗黑', value: '"HYQiHei-55J", "PingFang SC", sans-serif' },
  { label: '汉仪中简黑', value: '"HYZhongJianHeiJ", "PingFang SC", sans-serif' },
  { label: '书宋', value: '"ShuS-SC", "Songti SC", serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", Helvetica, sans-serif' },
  { label: 'Impact', value: 'Impact, Charcoal, sans-serif' },
  { label: 'Comic Sans MS', value: '"Comic Sans MS", "Comic Sans", cursive' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Futura', value: 'Futura, "Trebuchet MS", sans-serif' },
  { label: 'Gill Sans', value: '"Gill Sans", "Trebuchet MS", sans-serif' },
  { label: 'Didot', value: 'Didot, "Bodoni 72", serif' },
  { label: 'Baskerville', value: 'Baskerville, "Times New Roman", serif' },
  { label: 'Palatino', value: 'Palatino, "Palatino Linotype", serif' },
  { label: 'Copperplate', value: 'Copperplate, "Copperplate Gothic", serif' },
] as const

// ============================================
// 行距选项
// ============================================
export const LINE_HEIGHTS = [
  { label: '单倍', value: '1' },
  { label: '1.5', value: '1.5' },
  { label: '2.0', value: '2' },
  { label: '2.5', value: '2.5' },
  { label: '3.0', value: '3' },
] as const

// ============================================
// 段前/段后间距（以行为单位）
// ============================================
export const PARAGRAPH_SPACE_LINES = ['0', '0.5', '1', '1.5', '2', '2.5', '3'] as const

// 首行缩进（以字符为单位）
export const FIRST_LINE_INDENT_CHARS = ['0', '0.5', '1', '1.5', '2'] as const

// ============================================
// A4 页边距预设（像素，96 DPI）
// ============================================
export const MARGIN_PRESETS = [
  { label: '普通', top: 96, bottom: 96, left: 96, right: 96 },
  { label: '窄',   top: 48, bottom: 48, left: 48, right: 48 },
  { label: '适中', top: 96, bottom: 96, left: 72, right: 72 },
  { label: '宽',   top: 96, bottom: 96, left: 192, right: 192 },
] as const

export const DEFAULT_MARGIN = MARGIN_PRESETS[0]

// ============================================
// 70 色调色板
// ============================================
export const COLOR_PALETTE = [
  '#000000', '#262626', '#595959', '#8C8C8C', '#BFBFBF', '#D9D9D9', '#E8E8E8', '#F5F5F5', '#FAFAFA', '#FFFFFF',
  '#F5222D', '#FA8C16', '#FADB14', '#52C41A', '#13C2C2', '#1890FF', '#722ED1', '#EB2F96', '#FFD666', '#FF85C0',
  '#FFF1F0', '#FFF7E6', '#FEFFE6', '#F6FFED', '#E6FFFB', '#E6F7FF', '#F9F0FF', '#FFF0F6', '#FFFBE6', '#FFE6F0',
  '#FFCCC7', '#FFE7BA', '#FFFB8F', '#B7EB8F', '#87E8DE', '#91D5FF', '#D3ADF7', '#FFADD2', '#FFE58F', '#FFB8D2',
  '#FF7875', '#FFC069', '#FFF566', '#95DE64', '#5CDBD3', '#69C0FF', '#B37FEB', '#FF85C0', '#FFD666', '#FF9EC7',
  '#FF4D4F', '#FFA940', '#FFEC3D', '#73D13D', '#36CFC9', '#40A9FF', '#9254DE', '#F759AB', '#FFC53D', '#FF7AAE',
  '#CF1322', '#D46B08', '#D4B106', '#389E0D', '#08979C', '#096DD9', '#531DAB', '#C41D7F', '#D48806', '#C41D68',
]

export interface TiptapEditorProps {
  content?: Record<string, unknown> | null
  onChange?: (json: Record<string, unknown>, text: string) => void
  editable?: boolean
  trackChangesEnabled?: boolean
  authorName?: string
  onSelectionChange?: (selectedText: string, from: number, to: number) => void
}
