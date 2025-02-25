import { CommonModule } from '@angular/common';
import {
  Component,
  AfterViewInit,
  ElementRef,
  ViewChild,
  Input,
  HostListener,
  Output,
  EventEmitter,
} from '@angular/core';

@Component({
  selector: 'app-masonry',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './masonry.component.html',
  styleUrls: ['./masonry.component.scss'],
})
export class MasonryComponent implements AfterViewInit {
  @ViewChild('masonryContainer', { static: true })
  masonryContainer!: ElementRef<HTMLElement>;
  @Input('media') media: any[] = [];
  @Input('totalImages') totalImages: number = 0;
  @Output() imagesLoadedCount = new EventEmitter<number>();
  @Output() onOpen = new EventEmitter<number>();
  private imagesLoaded = 0;

  ngAfterViewInit() {
    this.resizeAllGridItems();
  }

  onOpenGallery(i: number) {
    this.onOpen.emit(i);
  }

  @HostListener('window:resize')
  onResize() {
    this.resizeAllGridItems();
  }

  onImageLoad() {
    setTimeout(() => {
      this.imagesLoaded++;
      this.imagesLoadedCount.emit(this.imagesLoaded);
      this.resizeAllGridItems();
    }, 100);
  }

  private resizeAllGridItems() {
    const allItems = this.masonryContainer.nativeElement.getElementsByClassName(
      'masonry-item-wrapper'
    );
    for (let x = 0; x < allItems.length; x++) {
      this.resizeGridItem(allItems[x] as HTMLElement);
    }
  }

  private resizeGridItem(item: HTMLElement) {
    const rowHeight = 0.1; // This matches the grid-auto-rows value
    const rowGap = parseInt(
      getComputedStyle(this.masonryContainer.nativeElement).getPropertyValue(
        'gap'
      )
    );

    const img = item.querySelector('img');
    if (img) {
      const height = img.getBoundingClientRect().height;
      const rowSpan = Math.ceil((height + rowGap) / (rowHeight + rowGap));
      item.style.gridRowEnd = `span ${rowSpan}`;
    }
  }
}
