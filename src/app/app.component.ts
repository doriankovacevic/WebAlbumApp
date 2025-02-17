import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FileUploadService } from './services/file-upload.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'WebAlbumApp';
  uploadedImages: any[] = [];
  selectedFiles: File[] = [];
  uploadProgress: number = 0;

  maxFiles: number = 5;

  constructor(private _fileUploadService: FileUploadService) {}

  onImageChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    if (input.files.length > this.maxFiles) {
      alert(`You can only upload a maximum of ${this.maxFiles} files.`);
      // Optionally clear the input so the user can re-select
      input.value = '';
      return;
    }

    // Otherwise, process the files

    // files type is any because the FileList type doesnt have an iterator function for some reason
    const files: any = input.files;
    this.selectedFiles = Array.from(input.files);
    for (const image of files) {
      const reader = new FileReader();

      reader.readAsDataURL(image);

      reader.onloadend = () => {
        if (!this.uploadedImages.includes(reader.result)) {
          this.uploadedImages.push(reader.result);
          console.log(this.uploadedImages);
        }
      };
    }
  }
  onUpload(): void {
    if (this.selectedFiles.length === 0) return;

    this._fileUploadService.uploadFiles(this.selectedFiles).subscribe({
      next: (progress) => {
        if (typeof progress === 'number') {
          this.uploadProgress = progress;
        } else {
          console.log('Upload successful', progress);
          this.uploadProgress = 0;
          this.selectedFiles = [];
        }
      },
      error: (error) => {
        console.error('Upload failed', error);
        this.uploadProgress = 0;
      },
    });
  }
}
