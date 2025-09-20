

/**
 * Service Container
 * Centralized access point for all services
 */

import { RoomService } from './room.service'
import { ItemService } from './item.service'
import { BoxService } from './box.service'
import { RackService } from './rack.service'

export { BaseService, ServiceError, ServiceResponseHandler } from './base.service'
export { RoomService } from './room.service'
export { ItemService } from './item.service'
export { BoxService } from './box.service'
export { RackService } from './rack.service'

/**
 * Service Container Class
 * Provides singleton instances of all services
 */
export class ServiceContainer {
  private static _roomService: RoomService
  private static _itemService: ItemService
  private static _boxService: BoxService
  private static _rackService: RackService

  static get roomService(): RoomService {
    if (!this._roomService) {
      this._roomService = new RoomService()
    }
    return this._roomService
  }

  static get itemService(): ItemService {
    if (!this._itemService) {
      this._itemService = new ItemService()
    }
    return this._itemService
  }

  static get boxService(): BoxService {
    if (!this._boxService) {
      this._boxService = new BoxService()
    }
    return this._boxService
  }

  static get rackService(): RackService {
    if (!this._rackService) {
      this._rackService = new RackService()
    }
    return this._rackService
  }

  /**
   * Reset all service instances (useful for testing)
   */
  static reset(): void {
    this._roomService = undefined as any
    this._itemService = undefined as any
    this._boxService = undefined as any
    this._rackService = undefined as any
  }
}

// Export convenience instances
export const roomService = ServiceContainer.roomService
export const itemService = ServiceContainer.itemService
export const boxService = ServiceContainer.boxService
export const rackService = ServiceContainer.rackService

