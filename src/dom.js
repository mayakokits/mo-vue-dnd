function indexOf(child, parent) {
  return Array.prototype.indexOf.call(parent.children, child)
}

function getDirectChild(parent, child) {
  return child.parentNode === parent ? child : getDirectChild(parent, child.parentNode)
}

export function indexOfDirectChild(parent, child) {
  const dChild = getDirectChild(parent, child)
  return indexOf(dChild, parent)
}