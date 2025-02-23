import {
  Component,
  Output,
  EventEmitter,
  HostListener,
  Input,
  ElementRef,
  ViewChild,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="drop-zone"
      [class.active]="isDragOver"
      (click)="fileInput.click()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <ng-container *ngIf="selectedFiles.length === 0; else fileList">
        <p>Drag files here or click to upload</p>
      </ng-container>
      <ng-template #fileList>
        <ul class="file-list">
          <li
            *ngFor="let file of selectedFiles; let i = index"
            class="file-item"
          >
            <div class="file-thumbnail">
              <img
                *ngIf="file.type.startsWith('image/')"
                [src]="getFileThumbnail(file)"
                alt="File thumbnail"
              />
              <video
                *ngIf="file.type.startsWith('video/')"
                [src]="getFileThumbnail(file)"
                controls
              ></video>
            </div>
            <span class="file-name">{{ file.name }}</span>
            <button class="remove-btn" (click)="removeFile(i, $event)">
              ×
            </button>
          </li>
        </ul>
        <div class="button-group">
          <button class="btn remove-all-btn" (click)="removeAllFiles($event)">
            Remove All
          </button>
          <button class="btn upload-btn" (click)="onUploadClick($event)">
            Upload
          </button>
        </div>
      </ng-template>
      <!-- The input field only accepts images at the moment, to support videos add "video/*"" to the accept attribute-->
      <input
        type="file"
        multiple
        accept="image/*"
        #fileInput
        hidden
        (change)="onFileSelected($event)"
      />
    </div>
  `,
  styles: [
    `
      .drop-zone {
        border: 2px dashed #ffb74d;
        border-radius: 10px;
        padding: 15px;
        text-align: center;
        transition: all 0.3s ease;
        background-color: #fff8e1;
        cursor: pointer;
      }
      .drop-zone.active {
        background-color: #ffe0b2;
        border-color: #ffa726;
      }
      .file-list {
        list-style-type: none;
        padding: 0;
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-start;
      }
      .file-item {
        position: relative;
        margin: 5px;
        text-align: center;
        width: 80px;
      }
      .file-thumbnail {
        width: 60px;
        height: 60px;
        margin-bottom: 5px;
        overflow: hidden;
        border-radius: 5px;
      }
      .file-thumbnail img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .file-thumbnail video {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .file-name {
        font-size: 10px;
        word-break: break-all;
        display: block;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .remove-btn {
        position: absolute;
        top: -5px;
        right: -5px;
        background-color: #ff5722;
        color: white;
        border: none;
        border-radius: 50%;
        width: 18px;
        height: 18px;
        font-size: 14px;
        line-height: 1;
        cursor: pointer;
        padding: 0;
      }
      .button-group {
        margin-top: 10px;
      }
      .btn {
        padding: 5px 10px;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.3s ease;
      }
      .remove-all-btn {
        background-color: #ff7043;
        color: white;
        margin-right: 5px;
      }
      .upload-btn {
        background-color: #66bb6a;
        color: white;
      }
      .btn:hover {
        opacity: 0.8;
      }
      p {
        margin: 0;
      }
    `,
  ],
})
export class UploadFileComponent implements OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  @Output() filesSelected = new EventEmitter<File[]>();
  @Output() uploadFiles = new EventEmitter<void>();
  @Input() set uploadComplete(value: boolean) {
    this.selectedFiles = [];
    this.filesSelected.emit([]);
    if (value) {
      this.selectedFiles = [];
      this.filesSelected.emit(this.selectedFiles);
      if (this.fileInput) {
        this.fileInput.nativeElement.value = '';
      }
    }
  }
  ngOnDestroy() {
    this.fileObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.fileObjectUrls.clear();
  }
  private fileObjectUrls = new Map<File, string>();

  getFileThumbnail(file: File): string {
    if (!this.fileObjectUrls.has(file)) {
      if (file.type.startsWith('image/')) {
        const objectUrl = URL.createObjectURL(file);
        this.fileObjectUrls.set(file, objectUrl);
      } else if (file.type.startsWith('video/')) {
        // Return a placeholder and generate the thumbnail asynchronously

        return 'assets/video-placeholder.png'; // Use a placeholder image
      }
    }
    return this.fileObjectUrls.get(file) || '';
  }

  isDragOver = false;
  selectedFiles: File[] = [];

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    const files = event.dataTransfer?.files;
    if (files) {
      this.handleFiles(files);
    }
  }

  onFileSelected(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    if (files) {
      this.handleFiles(files);
    }
  }

  private handleFiles(files: FileList) {
    const fileArray = Array.from(files);
    this.selectedFiles = [...this.selectedFiles, ...fileArray];
    this.filesSelected.emit(this.selectedFiles);
  }

  removeFile(index: number, event: Event) {
    event.stopPropagation();
    const removedFile = this.selectedFiles[index];
    this.selectedFiles.splice(index, 1);
    this.filesSelected.emit(this.selectedFiles);

    if (this.fileObjectUrls.has(removedFile)) {
      URL.revokeObjectURL(this.fileObjectUrls.get(removedFile)!);
      this.fileObjectUrls.delete(removedFile);
    }
  }

  removeAllFiles(event: Event) {
    event.stopPropagation();
    this.selectedFiles = [];
    this.fileObjectUrls.clear();
    this.filesSelected.emit(this.selectedFiles);
  }

  onUploadClick(event: Event) {
    event.stopPropagation();
    this.uploadFiles.emit();
  }
}
