import bus from '../bus'
import {default as DnDItem, ItemEventPayload} from '../item/Item'
import DnDHandle from '../handle/Handle'
import {
  DND_ITEM_SELECT,
  DND_ITEM_SELECTED,
  DND_ITEM_UNSELECTED,
  DND_HANDLE_MD,
  DND_TARGET_ENTER,
  DND_TARGET_ENTERED,
  ItemSelectPayload,
  TargetEnterPayload
} from '../events'

import {
  indexOfDirectDescendant,
  findAncestorByClassName
} from '../dom'

import drop from '../drop/drop'

import ItemContext from './ItemContext'
import ItemIntersection from './ItemIntersection'
import Options from './Options'

const t = 0

export default {
  props: {
    items: {
      type: Array,
      required: true
    },
    group: {
      type: String,
      default: null
    },
    options: {
      type: Options,
      default: () => new Options()
    },
    dropHandler: {
      type: Function,
      required: false,
      default: drop
    },
    keyFn: {
      type: Function,
      required: false
    }
  },
  data() {
    return {
      selectedTarget: false,
      selectedItem: null,
      itemIntersection: null
    }
  },
  mounted() {
    bus.$on(DND_ITEM_SELECTED, this.setSelectedItem)
    bus.$on(DND_ITEM_UNSELECTED, this.resetSelectedItem)
    bus.$on(DND_HANDLE_MD, this.onMousedown)
    bus.$on(DND_TARGET_ENTERED, this.resetIntersection)
  },
  beforeDestroy() {
    bus.$off(DND_ITEM_SELECTED, this.setSelectedItem)
    bus.$off(DND_ITEM_UNSELECTED, this.resetSelectedItem)
    bus.$off(DND_HANDLE_MD, this.onMousedown)
    bus.$off(DND_TARGET_ENTERED, this.resetIntersection)
  },
  computed: {
    dropPreviewResult() {
      return this.itemIntersection ? this.dropHandler(this.itemIntersection): null
    },
    renderedItems() {
      return this.dropPreviewResult ? this.dropPreviewResult.targetResult.container: this.items
    }
  },
  methods: {
    setSelectedItem(selectedItem) {
      this.selectedItem = selectedItem
    },
    resetSelectedItem() {
      this.selectedItem = null
      this.itemIntersection = null
    },
    resetIntersection(payload) {
      if(payload.targetRef !== this) {
        this.selectedTarget = false
        this.itemIntersection = null
        console.log('blub')
      } else {
        this.selectedTarget = true
      }
    },
    onMousedown(payload) {
      const container = payload.container
      if(this.items !== container) {return}
      const event = payload.event
      const parent = this.$refs.content
      const child = event.target
      const index = indexOfDirectDescendant(parent, child)
      if(index >= 0 && index < this.items.length) {
        const itemWrapper = findAncestorByClassName(child, 'mo-dndItem')
        const payload = new ItemSelectPayload(
          event, itemWrapper,
          new ItemContext(this.group, this.items, index, this.options, this.emitUpdate))
        bus.$emit(DND_ITEM_SELECT, payload)
        bus.$emit(DND_TARGET_ENTER, new TargetEnterPayload(this))
      }
    },
    onMouseenter(event) {
      event.stopPropagation()
      if(this.selectedItem) {
        bus.$emit(DND_TARGET_ENTER, new TargetEnterPayload(this))
      }
    },
    onMouseleave() {
      this.itemIntersection = null
    },
    onMove(dragTargetOrMouseEvent) {
      if(this.selectedItem && this.selectedTarget) {
        const trgIndex = dragTargetOrMouseEvent instanceof ItemEventPayload ?
          dragTargetOrMouseEvent.index: 0

        // if(dragTargetOrMouseEvent instanceof ItemEventPayload) {
        //   dragTargetOrMouseEvent.event.stopPropagation()
        // } else {
        //   dragTargetOrMouseEvent.stopPropagation()
        // }

        // previous drop result
        const pDR = this.dropPreviewResult
        const pTarget = pDR? pDR.targetContext: null
        let sc = null
        let tc = null
        if(pDR) {
          // Same context
          sc = pTarget
          tc = new ItemContext(this.group, pTarget.container, trgIndex, this.options, this.emitUpdate)
        } else {
          sc = this.selectedItem
          tc = new ItemContext(this.group, this.items, trgIndex, this.options, this.emitUpdate)
        }

        if(tc.allowsDrop(sc)) {
          // Permissions ok
          let shouldInsertBefore = true
          if(dragTargetOrMouseEvent instanceof ItemEventPayload) {
            const eventRef = dragTargetOrMouseEvent.event
            const elemRef = dragTargetOrMouseEvent.elem
            const clientRect = elemRef.getBoundingClientRect()

            shouldInsertBefore = eventRef.clientY < clientRect.top+clientRect.height/2
          }

          // Previous intersection and current intersection
          const pInt = this.itemIntersection
          const cInt = new ItemIntersection(sc, tc, shouldInsertBefore)

          if(pTarget) {
            // Check whether new intersection would output same drop result
            const newTargetIndex = null
            if(sc.index < tc.index) {
              newTargetIndex = shouldInsertBefore ? tc.index-1: tc.index
            } else if(sc.index > tc.index) {
              newTargetIndex = shouldInsertBefore ? tc.index: tc.index+1
            } else {
              newTargetIndex = tc.index
            }

            if(pTarget.index === newTargetIndex) {
              return
            }
          } else if(pInt && pInt.equals(cInt)) {
            return
          }

          // New intersection
          this.itemIntersection = cInt
        }
      }

      if(this.selectedItem && !this.selectedTarget) {
        console.log('blah')
      }
    },
    onUp(dragTargetOrMouseEvent) {
      const dr = this.dropPreviewResult
      if(dr) {
        if(!dr.sameContext) {
          dr.sourceResult.update()
        }
        dr.targetResult.update()
      }
    },
    emitUpdate(payload) {
      this.$emit('update', payload)
    }
  },
  render() {
    const dndItemSlot = this.$scopedSlots.default
    const empty = <div class="mo-dndItemsEmpty" onMousemove={this.onMove}>Empty</div>

    // Current drop result
    const dr = this.dropPreviewResult
    const tIndex = dr ? dr.targetContext.index : -1
    const si = this.selectedItem
    const sIndex = si && !dr ? si.index: -1
    const isSelectedContainer = si ? si.container === this.items: false
    const items = this.renderedItems.map((item, index) => {
      // An item may be flagged as selected or projected
      const isProjectedItem = index === tIndex
      const isSelectedItem = index === sIndex && isSelectedContainer

      const key = this.keyFn ? this.keyFn(item): index

      return (
        <DnDItem item={item} index={index} key={key} keyTest={key}
          isSelected={isSelectedItem}
          isProjected={isProjectedItem}
          onMove={this.onMove} onUp={this.onUp}>
          {dndItemSlot({item, index, container: this.items, isSelectedItem, isProjectedItem})}
        </DnDItem>)
    })

    const content = (
      <div class="mo-dndItems" onMouseenter={this.onMouseenter} onMouseleave={this.onMouseleave} onMouseup={this.onUp} ref="content">
        {this.renderedItems.length > 0 ? items : empty}
      </div>)

    return this.renderedItems.length > 0 && this.options.wrapDnDHandle ?
      <DnDHandle container={this.items}>{content}</DnDHandle>: content
  }
}
