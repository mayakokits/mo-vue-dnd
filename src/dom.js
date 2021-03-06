export const doc = document

export function indexOf(child, parent) {
  return Array.prototype.indexOf.call(parent.children, child)
}

function getDirectChild(parent, child) {
  return child === null || child.parentNode === parent ? child : getDirectChild(parent, child.parentNode)
}

export function indexOfDirectDescendant(parent, child) {
  const dChild = getDirectChild(parent, child)
  return indexOf(dChild, parent)
}

export function findAncestorByClassName(child, clsName) {
  if(!child) {return}
  if(child.parentNode === document) {
    return null
  } else if(child.classList.contains(clsName)) {
    return child
  } else {
    return child.parentNode && child.parentNode.classList.contains(clsName) ?
      child.parentNode:
      findAncestorByClassName(child.parentNode, clsName)
  }
}

export function isDescendant(parent, child) {
  if(child && child.parentNode) {
    return child.parentNode !== parent? isDescendant(parent, child.parentNode): true
  } else {
    return false
  }
}
