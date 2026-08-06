declare module '*.css'

declare module '*.png' {
  const assetPath: string
  export default assetPath
}
