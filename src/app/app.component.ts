import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadService } from './services/upload.service';
import { ImageGalleryComponent } from './image-gallery/image-gallery.component';
import { UploadFileComponent } from './upload-file/upload-file.component';
import { NgxMasonryModule } from 'ngx-masonry';
import { LoaderComponent } from './loader/loader.component';
import { WelcomeScreenComponent } from './welcome-screen/welcome-screen.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    ImageGalleryComponent,
    UploadFileComponent,
    NgxMasonryModule,
    LoaderComponent,
    WelcomeScreenComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  @ViewChild(ImageGalleryComponent) imageGallery!: ImageGalleryComponent;
  @ViewChild(UploadFileComponent) uploadComponent!: UploadFileComponent;

  selectedFiles: File[] = [];
  isLoading = false;
  images: any[] = [];
  uploadFinished = false;
  visitorName = '';

  readonly masonryOptions = {
    itemSelector: '.masonryItem',
    gutter: 2, // Add some gutter
    fitWidth: false, // Change to false
    columnWidth: '.masonryItem', // Use the item as the column width
    percentPosition: true, // Change to true
    resize: true,
  };

  constructor(private uploadService: UploadService) {}

  ngOnInit(): void {
    this.getGallery();
  }

  // Handles the event when a visitor enters their name
  onNameEntered(name: string) {
    this.visitorName = name;
    console.log('Welcome, ' + name + '!');
  }

  // Fetches all images with metadata from the service
  getGallery(): void {
    this.isLoading = true;
    this.uploadService
      .getAllMediaWithMetadata()
      .then((data) => {
        this.images = data;
      })
      .catch((error) => console.error(error))
      .finally(() => (this.isLoading = false));
  }

  // Opens the image gallery at a specific index
  openGallery(index: number): void {
    this.imageGallery.openGallery(index);
  }

  // Updates the selected files when the user chooses images
  onImageChange(files: File[]): void {
    this.selectedFiles = files;
  }

  // Handles the upload process for selected files
  async onUpload(): Promise<void> {
    if (this.selectedFiles.length === 0) {
      console.log('No files selected');
      return;
    }

    this.isLoading = true;
    try {
      await Promise.all(
        this.selectedFiles.map((file) => this.uploadService.uploadFile(file))
      );
      console.log('All files uploaded successfully');
      this.getGallery();
      this.uploadFinished = true;
      this.uploadComponent.uploadComplete = true;
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      this.isLoading = false;
    }
  }
}
