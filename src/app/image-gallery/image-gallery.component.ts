import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
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
  private gallery: any;

  @Input() set media(value: any[]) {
    if (value.length > 0) {
      this.updateGallery(value);
    }
  }

  openGallery(i: number) {
    this.gallery?.openGallery(i);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['media'] && !changes['media'].firstChange) {
      this.updateGallery(changes['media'].currentValue);
    }
  }

  ngAfterViewInit(): void {
    this.initializeGallery();
  }

  private initializeGallery(): void {
    this.gallery = lightGallery(this.galleryElement.nativeElement, {
      dynamic: true,
      dynamicEl: [],
      plugins: [lgZoom, lgThumbnails, lgFullscreen, lgVideo],
      thumbnail: true,
      videojs: true,
      videojsOptions: {
        muted: false,
        controls: true,
      },
    });
  }

  private updateGallery(media: any[]): void {
    if (!this.gallery) {
      this.initializeGallery();
    }

    const elements = this.mapMediaToElements(media);
    this.gallery.refresh(elements);
  }

  private mapMediaToElements(media: any[]): any[] {
    return media.map((item) => {
      const isVideo = item.metadata.contentType.startsWith('video/');
      const formattedDate = this.formatDate(item.metadata.date);
      const formattedTime = this.formatTime(item.metadata.date);

      return {
        src: item.url,
        thumb: item.url,
        subHtml: `
          <div class="lightGallery-captions">
            <p>${item.metadata.shotBy} ${
          formattedDate && formattedTime
            ? formattedDate + ' u ' + formattedTime
            : ''
        }</p>
          </div>
        `,
        ...(isVideo && {
          video: {
            source: [{ src: item.url, type: item.metadata.contentType }],
            attributes: { preload: false, controls: true },
          },
        }),
      };
    });
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
    if (parts.length < 2) return ''; // Return empty string if time part is missing
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
