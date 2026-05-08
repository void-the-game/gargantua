import { AzureBlobService } from '@/infrastructure/services/AzureBlobService'

export class ListAvatarsUseCase {
  constructor(private blobService: AzureBlobService) {}

  async execute() {
    return this.blobService.listBlobs()
  }
}
