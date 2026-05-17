import { Request, Response } from 'express'
import { ListRoomsUseCase } from '@/application/useCases/ListRoomsUseCase'
import { GetRoomUseCase } from '@/application/useCases/GetRoomUseCase'

export class RoomController {
  private listRoomsUseCase: ListRoomsUseCase
  private getRoomUseCase: GetRoomUseCase

  constructor() {
    this.listRoomsUseCase = new ListRoomsUseCase()
    this.getRoomUseCase = new GetRoomUseCase()
  }

  async listRooms(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string, 10) || 1
      const limit = parseInt(req.query.limit as string, 10) || 10
      const search = (req.query.search as string) || ''

      const result = await this.listRoomsUseCase.execute({ page, limit, search })

      res.status(200).json(result)
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' })
    }
  }

  async getRoom(req: Request, res: Response) {
    try {
      const { code } = req.params

      const result = await this.getRoomUseCase.execute(code)

      if (!result) {
        res.status(404).json({ error: 'Room not found' })
        return
      }

      res.status(200).json(result)
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' })
    }
  }
}
