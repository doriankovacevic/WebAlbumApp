import {
  Component,
  OnInit,
  ViewChild,
  HostListener,
  ChangeDetectorRef,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadService } from './services/upload.service';
import { ImageGalleryComponent } from './image-gallery/image-gallery.component';
import { UploadFileComponent } from './upload-file/upload-file.component';
import { NgxMasonryModule, NgxMasonryComponent } from 'ngx-masonry';
import { LoaderComponent } from './loader/loader.component';
import { WelcomeScreenComponent } from './welcome-screen/welcome-screen.component';
import { RouterOutlet } from '@angular/router';
import imagesLoaded from 'imagesloaded';
import { MasonryComponent } from './masonry/masonry.component';

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
    MasonryComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, AfterViewChecked {
  @ViewChild(ImageGalleryComponent) imageGallery!: ImageGalleryComponent;
  @ViewChild(UploadFileComponent) uploadComponent!: UploadFileComponent;

  selectedFiles: File[] = [];
  isLoading = false;
  images: any[] = [];
  uploadFinished = false;
  visitorName = '';
  lastDoc: any = null;
  pageSize = 20;
  allImagesLoaded = false;
  totalImages: number = 0;

  constructor(
    private uploadService: UploadService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.getGallery();
    this.uploadService
      .getTotalObjectCount()
      .then((res) => (this.totalImages = res));
  }
  onImagesLoadedCount(count: number) {
    if (this.totalImages === count) {
      this.allImagesLoaded = true;
    }
    // You can use this count to update a progress bar or for other purposes
  }

  ngAfterViewChecked(): void {}

  @HostListener('window:scroll', ['$event'])
  onScroll() {
    if (this.shouldLoadMore()) {
      this.loadMoreImages();
      this.isLoading = true;
    }
  }

  private shouldLoadMore(): boolean {
    return (
      window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 &&
      !this.allImagesLoaded
    );
  }

  getGallery(): void {
    this.isLoading = true;
    this.uploadService
      .getMediaWithMetadataPaginated(null, this.pageSize)
      .then((data) => {
        this.handleNewData(data);
        console.log(data);
      })
      .catch(console.error)
      .finally(() => {
        this.isLoading = false;
      });
  }

  loadMoreImages(): void {
    if (this.isLoading || this.allImagesLoaded) return;
    this.isLoading = true;

    this.uploadService
      .getMediaWithMetadataPaginated(this.lastDoc, this.pageSize)
      .then((data) => {
        if (data.length === 0) {
          this.allImagesLoaded = true;
          return;
        }
        this.handleNewData(data);
      })
      .catch(console.error)
      .finally(() => {
        this.isLoading = false;
      });
  }

  private handleNewData(data: any[]): void {
    this.images = [...this.images, ...data];

    this.lastDoc = data[data.length - 1];
    this.changeDetectorRef.detectChanges();
  }

  openGallery(index: number): void {
    this.imageGallery?.openGallery(index);
  }

  onImageChange(files: File[]): void {
    this.selectedFiles = files;
  }

  async onUpload(): Promise<void> {
    if (this.selectedFiles.length === 0) return;

    this.isLoading = true;
    try {
      await Promise.all(
        this.selectedFiles.map((file) => this.uploadService.uploadFile(file))
      );
      this.resetAndReload();
      this.getGallery();
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private resetAndReload(): void {
    this.images = [];
    this.lastDoc = null;
    this.allImagesLoaded = false;
    this.uploadFinished = true;
    this.uploadComponent.uploadComplete = true;
    this.getGallery();
  }

  onNameEntered(name: string) {
    this.visitorName = name;
  }
}
