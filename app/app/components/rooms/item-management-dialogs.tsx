
'use client'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ItemForm } from '@/components/items/item-form'
import { BoxForm } from '@/components/boxes/box-form'
import { RackForm } from '@/components/racks/rack-form'
import { BoxPlacementDialog } from '@/components/boxes/box-placement-dialog'
import { ShelfSpaceDialog } from '@/components/shelf-space-dialog'
import { PositionCapacityConfig } from './position-capacity-config'

interface Room {
  id: string
  name: string
  description?: string
  color?: string
}

interface Rack {
  id: string
  name: string
  rackNumber: number
  maxShelves: number
  positionsPerShelf: number
  shelfConfig?: any[]
  configLocked?: boolean
  positions: Position[]
}

interface Position {
  id: string
  shelfNumber: number
  positionNumber: number
  capacity: number
  boxPositions: BoxPosition[]
  looseItems?: Item[]
  virtualContainer?: VirtualContainer
}

interface BoxPosition {
  box: Box
}

interface Box {
  id: string
  boxNumber: number
  name?: string
  description?: string
  size: string
  type: string
  isStaging: boolean
  roomId: string
  items?: Item[]
  _count?: {
    items: number
  }
}

interface Item {
  id: string
  name: string
  description?: string
  quantity: number
  value?: number
  condition?: string
  category?: string
  location?: string
  imageUrl?: string
}

interface VirtualContainer {
  id: string
  name: string
  description?: string
  category?: string
  items: Item[]
  itemCount: number
}

interface ItemManagementDialogsProps {
  // Item Form
  isItemFormOpen: boolean
  itemFormContext: any
  isSubmittingItem: boolean
  onSubmitItem: (data: any) => void
  onCancelItemForm: () => void
  
  // Box Form  
  isBoxFormOpen: boolean
  editingBox: Box | null
  isSubmittingBox: boolean
  onCreateBox: (data: any) => void
  onCancelBoxForm: () => void
  
  // Rack Form
  isRackFormOpen: boolean
  editingRack: Rack | null
  isSubmittingRack: boolean
  isDeletingRack: boolean
  nextAvailableRackNumber: number
  onCreateRack: (data: any) => void
  onCancelRackForm: () => void
  onDeleteRack: () => void
  
  // Box Placement
  placementDialogOpen: boolean
  boxToPlace: Box | null
  racks: Rack[]
  onPlacementComplete: () => void
  onClosePlacementDialog: () => void
  
  // Shelf Space
  shelfSpaceDialogOpen: boolean
  selectedShelfSpace: {
    rack: Rack
    shelfNumber: number
    positionNumber: number
    position?: Position
  } | null
  roomId: string
  onCloseShelfSpaceDialog: () => void
  onManagePosition: (positionId: string) => void
  onMoveAllBoxesToStaging: (positionId: string) => void
  
  // Position Capacity
  isCapacityConfigOpen: boolean
  configuringRack: Rack | null
  onUpdatePositionCapacities: (capacities: { [positionId: string]: number }) => void
  onCancelCapacityConfig: () => void
}

export const ItemManagementDialogs = ({
  // Item Form
  isItemFormOpen,
  itemFormContext,
  isSubmittingItem,
  onSubmitItem,
  onCancelItemForm,
  
  // Box Form
  isBoxFormOpen,
  editingBox,
  isSubmittingBox,
  onCreateBox,
  onCancelBoxForm,
  
  // Rack Form
  isRackFormOpen,
  editingRack,
  isSubmittingRack,
  isDeletingRack,
  nextAvailableRackNumber,
  onCreateRack,
  onCancelRackForm,
  onDeleteRack,
  
  // Box Placement
  placementDialogOpen,
  boxToPlace,
  racks,
  onPlacementComplete,
  onClosePlacementDialog,
  
  // Shelf Space
  shelfSpaceDialogOpen,
  selectedShelfSpace,
  roomId,
  onCloseShelfSpaceDialog,
  onManagePosition,
  onMoveAllBoxesToStaging,
  
  // Position Capacity
  isCapacityConfigOpen,
  configuringRack,
  onUpdatePositionCapacities,
  onCancelCapacityConfig
}: ItemManagementDialogsProps) => {
  return (
    <>
      {/* Item Form Dialog */}
      <Dialog open={isItemFormOpen} onOpenChange={onCancelItemForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <ItemForm
            context={itemFormContext}
            onSubmit={onSubmitItem}
            onCancel={onCancelItemForm}
            isLoading={isSubmittingItem}
          />
        </DialogContent>
      </Dialog>

      {/* Box Form Dialog */}
      <Dialog open={isBoxFormOpen} onOpenChange={onCancelBoxForm}>
        <DialogContent className="max-w-md">
          <BoxForm
            roomId={roomId}
            onSubmit={async (data) => { await onCreateBox(data); }}
            onCancel={onCancelBoxForm}
            isLoading={isSubmittingBox}
            initialData={editingBox || undefined}
            isEditMode={!!editingBox}
          />
        </DialogContent>
      </Dialog>

      {/* Rack Form Dialog */}
      <Dialog open={isRackFormOpen} onOpenChange={onCancelRackForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <RackForm
            roomId={roomId}
            onSubmit={onCreateRack}
            onCancel={onCancelRackForm}
            onDelete={editingRack ? onDeleteRack : undefined}
            isLoading={isSubmittingRack}
            isDeleting={isDeletingRack}
            initialData={editingRack || undefined}
            isEditMode={!!editingRack}
            nextAvailableRackNumber={nextAvailableRackNumber}
          />
        </DialogContent>
      </Dialog>

      {/* Box Placement Dialog */}
      {boxToPlace && (
        <BoxPlacementDialog
          isOpen={placementDialogOpen}
          onClose={onClosePlacementDialog}
          box={boxToPlace}
          onPlacementComplete={onPlacementComplete}
          roomId={roomId}
        />
      )}

      {/* Shelf Space Dialog */}
      {selectedShelfSpace && (
        <ShelfSpaceDialog
          isOpen={shelfSpaceDialogOpen}
          onClose={onCloseShelfSpaceDialog}
          shelfSpace={selectedShelfSpace}
          onManagePosition={onManagePosition}
          onMoveAllToStaging={onMoveAllBoxesToStaging}
        />
      )}

      {/* Position Capacity Configuration Dialog */}
      <Dialog open={isCapacityConfigOpen} onOpenChange={onCancelCapacityConfig}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {configuringRack && (
            <PositionCapacityConfig
              rack={configuringRack}
              onSave={(capacities) => onUpdatePositionCapacities(capacities)}
              onCancel={onCancelCapacityConfig}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
