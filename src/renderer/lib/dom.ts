// Tiny DOM helper — no framework, same spirit as the rest of the app.

type Child = Node | string | null | undefined | false
type Props = Record<string, unknown>

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue
    if (key === 'class') node.className = String(value)
    else if (key === 'text') node.textContent = String(value)
    else if (key === 'html') node.innerHTML = String(value)
    else if (key === 'dataset') Object.assign(node.dataset, value as object)
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value as EventListener)
    } else if (key in node) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(node as any)[key] = value
    } else {
      node.setAttribute(key, String(value))
    }
  }
  for (const child of children) {
    if (child == null || child === false) continue
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child)
  }
  return node
}

export function clear(node: HTMLElement): void {
  node.replaceChildren()
}
