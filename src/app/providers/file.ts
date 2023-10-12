import { HttpClient, HttpEventType } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { LoadingController } from '@ionic/angular';
import { typePropertyIsNotAllowedInProps } from '@ngrx/store/src/models';
import { CallFilesService, CallProtocolsService, CallsService } from '@resgrid/ngx-resgridlib';
import { FileOpener } from '@capacitor-community/file-opener';

@Injectable({
	providedIn: 'root',
})
export class FileProvider {
	

	constructor(private protocolsService: CallProtocolsService,
                private callFilesService: CallFilesService) {}



	public async openProtocolAttachment(attachmentName: string, attachmentId: string) {
		this.protocolsService.getCallProtocolAttachmentFile(attachmentId).subscribe(async (event) => {
            if (event.type === HttpEventType.DownloadProgress) {

            } else if (event.type === HttpEventType.Response) {

                const base64 = await this.convertBlobToBase64(event.body) as string;

                const savedFile = await Filesystem.writeFile({
                    path: attachmentName,
                    data: base64,
                    directory: Directory.Documents,
                });

                await FileOpener.open({filePath: savedFile.uri});
            }
        });
	}

    public async openCallFile(fileName: string, url: string) {
		this.callFilesService.getCallAttachmentFile(url).subscribe(async (event) => {
            if (event.type === HttpEventType.DownloadProgress) {

            } else if (event.type === HttpEventType.Response) {

                const base64 = await this.convertBlobToBase64(event.body) as string;

                const savedFile = await Filesystem.writeFile({
                    path: fileName,
                    data: base64,
                    directory: Directory.Documents,
                });

                await FileOpener.open({filePath: savedFile.uri});
            }
        });
	}

    private convertBlobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = reject;
            reader.onload = () => {
                resolve(reader.result as string);
            };
            reader.readAsDataURL(blob);
        });
    }
}
