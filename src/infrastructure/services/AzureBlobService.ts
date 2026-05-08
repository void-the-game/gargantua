import { BlobServiceClient, ContainerClient } from '@azure/storage-blob'

export class AzureBlobService {
  private blobServiceClient: BlobServiceClient
  private containerClient: ContainerClient

  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME

    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING is not defined')
    }
    if (!containerName) {
      throw new Error('AZURE_STORAGE_CONTAINER_NAME is not defined')
    }

    this.blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString)
    this.containerClient =
      this.blobServiceClient.getContainerClient(containerName)
  }

  async uploadBlob(
    blobName: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName)
    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: contentType },
    })
    return blockBlobClient.url
  }

  async listBlobs(): Promise<{ name: string; url: string }[]> {
    const blobs = []
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME

    for await (const blob of this.containerClient.listBlobsFlat()) {
      blobs.push({
        name: blob.name,
        url: `https://${this.blobServiceClient.accountName}.blob.core.windows.net/${containerName}/${blob.name}`,
      })
    }

    return blobs
  }

  async getBlobUrl(blobName: string): Promise<string> {
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME
    return `https://${this.blobServiceClient.accountName}.blob.core.windows.net/${containerName}/${blobName}`
  }

  async blobExists(blobName: string): Promise<boolean> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName)
    return blockBlobClient.exists()
  }

  async deleteBlob(blobName: string): Promise<void> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName)
    await blockBlobClient.deleteIfExists()
  }
}
