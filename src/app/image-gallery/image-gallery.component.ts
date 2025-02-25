import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
  Output,
  EventEmitter,
} from '@angular/core';
import { NgxMasonryModule } from 'ngx-masonry';
import lightGallery from 'lightgallery';
import lgZoom from 'lightgallery/plugins/zoom';
import lgThumbnails from 'lightgallery/plugins/thumbnail';
import lgFullscreen from 'lightgallery/plugins/fullscreen';
import lgVideo from 'lightgallery/plugins/video';

@Component({
  selector: 'app-image-gallery',
  standalone: true,
  imports: [CommonModule, NgxMasonryModule],
  templateUrl: './image-gallery.component.html',
  styleUrl: './image-gallery.component.scss',
})
export class ImageGalleryComponent implements OnChanges, AfterViewInit {
  @ViewChild('galleryElement') galleryElement!: ElementRef;
  @Output('shouldLoadMore') shouldLoadMore = new EventEmitter<boolean>();

  private gallery: any;
  private currentMedia: any[] = [];
  private loadingMore = false;

  @Input() media: any[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['media']) {
      this.currentMedia = [...this.media];
      if (this.gallery) {
        console.log(this.currentMedia);
        this.updateGallery();
      }
    }
  }

  ngAfterViewInit(): void {
    this.initializeGallery();
  }

  private onSlideChange(event: any): void {
    const { index } = event.detail;
    if (index >= this.media.length - 3) {
      this.shouldLoadMore.emit();
    }
  }

  openGallery(index: number): void {
    if (this.gallery) {
      this.gallery.openGallery(index);
    }
  }

  private initializeGallery(): void {
    this.destroyGallery();
    console.log(this.currentMedia);

    this.galleryElement.nativeElement.addEventListener(
      'lgBeforeSlide',
      this.onSlideChange.bind(this)
    );
    // Ensure dynamicEl is always an array
    const elements = this.mapMediaToElements(this.currentMedia);
    this.gallery = lightGallery(this.galleryElement.nativeElement, {
      dynamic: true,
      dynamicEl: elements, // Pass the mapped array directly
      plugins: [lgZoom, lgThumbnails, lgFullscreen, lgVideo],
      thumbnail: true,
      videojs: true,
      videojsOptions: {
        muted: false,
        controls: true,
      },
    });
  }

  private updateGallery(): void {
    if (!this.gallery) return;

    // Get fresh mapped elements
    const elements = this.mapMediaToElements(this.currentMedia);

    // Properly refresh gallery with new elements
    this.gallery.refresh(elements);
    this.loadingMore = false;
  }

  private mapMediaToElements(media: any[]): any[] {
    // Add null checks for all properties
    return media.map((item) => ({
      src: item?.url || '',
      thumb: item?.url || '',
      subHtml: `
        <div class="lightGallery-captions">
          <p>${item?.metadata?.shotBy || ''} ${
        this.formatDate(item?.metadata?.date) &&
        this.formatTime(item?.metadata?.date)
          ? `${this.formatDate(item.metadata.date)} u ${this.formatTime(
              item.metadata.date
            )}`
          : ''
      }</p>
        </div>
      `,
      ...(item?.metadata?.contentType?.startsWith('video/')
        ? {
            video: {
              source: [{ src: item.url, type: item.metadata.contentType }],
              attributes: { preload: false, controls: true },
            },
          }
        : {}),
    }));
  }

  private destroyGallery(): void {
    if (this.gallery) {
      this.galleryElement.nativeElement.removeEventListener(
        'onAfterSlide',
        this.onSlideChange
      );
      this.gallery.destroy(true);
      this.gallery = null;
    }
  }

  private formatDate(dateString: string): string {
    if (!dateString) return '';
    const [datePart] = dateString.split(' ');
    const [year, month, day] = datePart.split(':');
    const date = new Date(+year, +month - 1, +day);
    return date.toLocaleDateString('hr', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private formatTime(dateString: string): string {
    if (!dateString) return '';
    const parts = dateString.split(' ');
    if (parts.length < 2) return '';
    const timePart = parts[1];
    const [hour, minute] = timePart.split(':');
    const date = new Date();
    date.setHours(+hour, +minute);
    return date.toLocaleTimeString('hr', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
