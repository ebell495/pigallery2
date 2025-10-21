import {Component, ElementRef, OnInit, TemplateRef, ViewChild,} from '@angular/core';
import {AlbumsService} from './albums.service';
import {BsModalService} from 'ngx-bootstrap/modal';
import {BsModalRef} from 'ngx-bootstrap/modal/bs-modal-ref.service';
import {SearchQueryTypes, TextSearch,} from '../../../../common/entities/SearchQueryDTO';
import {UserRoles} from '../../../../common/entities/UserDTO';
import {AuthenticationService} from '../../model/network/authentication.service';
import {PiTitleService} from '../../model/pi-title.service';
import { FrameComponent } from '../frame/frame.component';
import { NgFor, NgIf, AsyncPipe } from '@angular/common';
import { AlbumComponent } from './album/album.component';
import { NgIconComponent } from '@ng-icons/core';
import { FormsModule } from '@angular/forms';
import { GallerySearchQueryBuilderComponent } from '../gallery/search/query-builder/query-bulder.gallery.component';
import { SavedSearchPopupComponent } from './saved-search-popup/saved-search-popup.component';

@Component({
    selector: 'app-albums',
    templateUrl: './albums.component.html',
    styleUrls: ['./albums.component.css'],
    imports: [
        FrameComponent,
        NgFor,
        AlbumComponent,
        NgIf,
        NgIconComponent,
        FormsModule,
        GallerySearchQueryBuilderComponent,
        SavedSearchPopupComponent,
        AsyncPipe,
    ]
})
export class AlbumsComponent implements OnInit {
  @ViewChild('container', {static: true}) container: ElementRef;
  public size: number;
  public savedSearch = {
    name: '',
    searchQuery: {type: SearchQueryTypes.any_text, text: ''} as TextSearch,
  };
  private modalRef: BsModalRef;

  constructor(
      public albumsService: AlbumsService,
      private modalService: BsModalService,
      public authenticationService: AuthenticationService,
      private piTitleService: PiTitleService
  ) {
    this.albumsService.getAlbums().catch(console.error);
  }

  ngOnInit(): void {
    this.piTitleService.setTitle($localize`Albums`);
    this.updateSize();
  }

  get CanCreateAlbum(): boolean {
    return this.authenticationService.user.getValue().role >= UserRoles.Admin;
  }

  public async openModal(template: TemplateRef<any>): Promise<void> {
    this.modalRef = this.modalService.show(template, {class: 'modal-lg'});
    document.body.style.paddingRight = '0px';
  }

  public hideModal(): void {
    this.modalRef.hide();
    this.modalRef = null;
  }

  async saveSearch(): Promise<void> {
    await this.albumsService.addSavedSearch(
        this.savedSearch.name,
        this.savedSearch.searchQuery
    );
    this.hideModal();
  }

  private updateSize(): void {
    const size = 220 + 5;
    // body - container margin
    const containerWidth = this.container.nativeElement.clientWidth - 30;
    this.size = containerWidth / Math.round(containerWidth / size) - 5;
  }
}

