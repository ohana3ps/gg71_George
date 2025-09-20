
import { Item } from '@prisma/client'

export interface ItemWithRoom extends Item {
  room: {
    id: string
    name: string
    color: string
  }
}

export interface ItemWithPosition extends ItemWithRoom {
  position?: {
    id: string
    shelfNumber: number
    positionNumber: number
    rack: {
      id: string
      name: string
      rackNumber: number
    }
  }
}

export interface ItemWithBox extends ItemWithRoom {
  box?: {
    id: string
    boxNumber: number
    name?: string
    size: string
    isStaging: boolean
  }
}

export interface FullItemDetails extends ItemWithRoom {
  position?: {
    id: string
    shelfNumber: number
    positionNumber: number
    rack: {
      id: string
      name: string
      rackNumber: number
    }
  }
  box?: {
    id: string
    boxNumber: number
    name?: string
    size: string
    isStaging: boolean
    positions?: {
      position: {
        rack: {
          id: string
          name: string
          rackNumber: number
        }
      }
    }[]
  }
}
