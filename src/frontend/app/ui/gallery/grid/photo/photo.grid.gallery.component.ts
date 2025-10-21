import {Component, ElementRef, Input, OnDestroy, OnInit, ViewChild,} from '@angular/core';
import {Dimension, IRenderable} from '../../../../model/IRenderable';
import {GridMedia} from '../GridMedia';
import {RouterLink} from '@angular/router';
import {Thumbnail, ThumbnailManagerService,} from '../../thumbnailManager.service';
import {Config} from '../../../../../../common/config/public/Config';
import {PageHelper} from '../../../../model/page.helper';
import {PhotoDTO, PhotoMetadata,} from '../../../../../../common/entities/PhotoDTO';
import {SearchQueryTypes, TextSearch, TextSearchQueryMatchTypes,} from '../../../../../../common/entities/SearchQueryDTO';
import {AuthenticationService} from '../../../../model/network/authentication.service';
import {ExtensionService} from '../../../../model/extension.service';
import {MediaButtonModalService} from './media-button-modal/media-button-modal.service';
import {NgFor, NgIf, NgSwitch, NgSwitchCase} from '@angular/common';
import {GalleryPhotoLoadingComponent} from './loading/loading.photo.grid.gallery.component';
import {NgIconComponent} from '@ng-icons/core';
import {DurationPipe} from '../../../../pipes/DurationPipe';
import {SafeHtmlPipe} from '../../../../pipes/SafeHTMLPipe';
import {IClientMediaButtonConfig} from '../../../../../../common/entities/extension/IClientUIConfig';
import {Utils} from '../../../../../../common/Utils';

export interface IClientMediaButtonConfigWithBaseApiPath extends IClientMediaButtonConfig {
  extensionBasePath: string;
}

@Component({
  selector: 'app-gallery-grid-photo',
  templateUrl: './photo.grid.gallery.component.html',
  styleUrls: ['./photo.grid.gallery.component.css'],
  imports: [
    NgIf,
    GalleryPhotoLoadingComponent,
    NgIconComponent,
    RouterLink,
    NgFor,
    NgSwitch,
    NgSwitchCase,
    DurationPipe,
    SafeHtmlPipe,
  ]
})
export class GalleryPhotoComponent implements IRenderable, OnInit, OnDestroy {
  @Input() gridMedia: GridMedia;
  @ViewChild('img', {static: false}) imageRef: ElementRef;
  @ViewChild('photoContainer', {static: true}) container: ElementRef;

  thumbnail: Thumbnail;
  keywords: { value: string; type: SearchQueryTypes }[] = null;
  infoBarVisible = false;
  animationTimer: number = null;

  readonly SearchQueryTypes: typeof SearchQueryTypes = SearchQueryTypes;
  searchEnabled = true;

  wasInView: boolean = null;
  loaded = false;
  public mediaButtons: IClientMediaButtonConfigWithBaseApiPath[];

  constructor(
    private thumbnailService: ThumbnailManagerService,
    private authService: AuthenticationService,
    private extensionService: ExtensionService,
    private modalService: MediaButtonModalService
  ) {
    this.searchEnabled = this.authService.canSearch();
  }

  get ScrollListener(): boolean {
    return !this.thumbnail.Available && !this.thumbnail.Error;
  }

  get Title(): string {
    if (Config.Gallery.captionFirstNaming === false) {
      return this.gridMedia.media.name;
    }
    if ((this.gridMedia.media as PhotoDTO).metadata.caption) {
      if ((this.gridMedia.media as PhotoDTO).metadata.caption.length > 20) {
        return (
          (this.gridMedia.media as PhotoDTO).metadata.caption.substring(0, 17) +
          '...'
        );
      }
      return (this.gridMedia.media as PhotoDTO).metadata.caption;
    }
    return this.gridMedia.media.name;
  }

  updateMediaButtons(): void {
    if (!this.extensionService.UIExtensionConfig) {
      return;
    }

    const allButtons: IClientMediaButtonConfigWithBaseApiPath[] = [];
    this.extensionService.UIExtensionConfig.forEach(config => {
      if (config.mediaButtons) {
        const buttons: IClientMediaButtonConfigWithBaseApiPath[] = Utils.clone(config.mediaButtons)
          .map((b: IClientMediaButtonConfigWithBaseApiPath) => {
            b.extensionBasePath = config.extensionBasePath;
            return b;
          });

        allButtons.push(...buttons);
      }
    });

    this.mediaButtons = allButtons.filter(button => {
      if (this.gridMedia.isVideo() && button.skipVideos) {
        return false;
      }
      if (this.gridMedia.isPhoto() && button.skipPhotos) {
        return false;
      }
      return true;
    });
  }

  ngOnInit(): void {
    this.thumbnail = this.thumbnailService.getThumbnail(this.gridMedia);
    const metadata = this.gridMedia.media.metadata as PhotoMetadata;
    if (
      (metadata.keywords && metadata.keywords.length > 0) ||
      (metadata.faces && metadata.faces.length > 0)
    ) {
      this.keywords = [];
      if (Config.Faces.enabled) {
        const names: string[] = (metadata.faces || []).map(
          (f): string => f.name
        );
        this.keywords = names
          .filter((name, index): boolean => names.indexOf(name) === index)
          .map((n): { type: SearchQueryTypes; value: string } => ({
            value: n,
            type: SearchQueryTypes.person,
          }));
      }
      this.keywords = this.keywords.concat(
        (metadata.keywords || []).map(
          (k): { type: SearchQueryTypes; value: string } => ({
            value: k,
            type: SearchQueryTypes.keyword,
          })
        )
      );
    }

    this.updateMediaButtons();
  }

  ngOnDestroy(): void {
    this.thumbnail.destroy();

    if (this.animationTimer != null) {
      clearTimeout(this.animationTimer);
    }
  }

  isInView(): boolean {
    return (
      PageHelper.ScrollY <
      this.container.nativeElement.offsetTop +
      this.container.nativeElement.clientHeight &&
      PageHelper.ScrollY + window.innerHeight >
      this.container.nativeElement.offsetTop
    );
  }

  onScroll(): void {
    if (this.thumbnail.Available === true || this.thumbnail.Error === true) {
      return;
    }
    const isInView = this.isInView();
    if (this.wasInView !== isInView) {
      this.wasInView = isInView;
      this.thumbnail.Visible = isInView;
    }
  }

  getPositionSearchQuery(): string {
    return JSON.stringify({
      type: SearchQueryTypes.position,
      matchType: TextSearchQueryMatchTypes.exact_match,
      text: this.getPositionText(),
    } as TextSearch);
  }

  getTextSearchQuery(name: string, type: SearchQueryTypes): string {
    return JSON.stringify({
      type,
      matchType: TextSearchQueryMatchTypes.exact_match,
      text: name,
    } as TextSearch);
  }

  getPositionText(): string {
    if (!this.gridMedia || !this.gridMedia.isPhoto() || !(this.gridMedia.media as PhotoDTO).metadata.positionData) {
      return '';
    }
    return ( //not much space in the gridview, so we only deliver city, or state or country
      (this.gridMedia.media as PhotoDTO).metadata.positionData.city ||
      (this.gridMedia.media as PhotoDTO).metadata.positionData.state ||
      (this.gridMedia.media as PhotoDTO).metadata.positionData.country || ''
    ).trim();
  }

  mouseOver(): void {
    this.infoBarVisible = true;
    if (this.animationTimer != null) {
      clearTimeout(this.animationTimer);
      this.animationTimer = null;
    }
  }

  mouseOut(): void {
    if (this.animationTimer != null) {
      clearTimeout(this.animationTimer);
    }
    this.animationTimer = window.setTimeout((): void => {
      this.animationTimer = null;
      this.infoBarVisible = false;
    }, 500);
  }

  onMediaButtonClick(button: IClientMediaButtonConfigWithBaseApiPath, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    if (button.popup) {
      this.modalService.showModal(button, this.gridMedia);
    } else {
      this.modalService.executeButtonAction(button, this.gridMedia);
    }
  }

  public getDimension(): Dimension {
    if (!this.imageRef) {
      return {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
      };
    }
    return {
      top: this.imageRef.nativeElement.offsetParent.offsetTop,
      left: this.imageRef.nativeElement.offsetParent.offsetLeft,
      width: this.imageRef.nativeElement.width,
      height: this.imageRef.nativeElement.height,
    };
  }
}
