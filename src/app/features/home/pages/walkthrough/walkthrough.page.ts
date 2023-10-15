import { Component, ElementRef, HostBinding, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { StorageProvider } from 'src/app/providers/storage';
import { Swiper } from 'swiper';

@Component({
	selector: 'app-home-walkthrough',
	templateUrl: './walkthrough.page.html',
	styleUrls: ['./styles/walkthrough.page.scss', './styles/walkthrough.shell.scss', './styles/walkthrough.responsive.scss'],
})
export class WalkthroughPage implements OnInit {
	@ViewChild('swiperRef', { static: true })
	protected _swiperRef: ElementRef | undefined;
	swiper?: Swiper;

	constructor(public menuCtrl: MenuController, private storageProvider: StorageProvider, private router: Router) {}

	ngOnInit() {}

	ionViewDidEnter() {
		//this.menuCtrl.swipeEnable(false, 'left');
		this.menuCtrl.enable(false, 'main-menu');
		this._initSwiper();
	}

	ionViewDidLeave() {
		this.menuCtrl.enable(true, 'main-menu');
	}

	ngAfterViewInit(): void {
		//this._initSwiper();
	}

	private _initSwiper() {
		const options = {
			pagination: { clickable: true },
			slidesPerView: 1,
			//breakpoints: this._getBreakpoints(), // In case you wish to calculate base on the `items` length
		};

		const swiperEl = this._swiperRef.nativeElement;
		Object.assign(swiperEl, options);

		swiperEl.initialize();

		if (this.swiper) this.swiper.currentBreakpoint = false; // Breakpoint fixes
		this.swiper = this._swiperRef.nativeElement.swiper;

		this.swiper.off('slideChange'); // Avoid multiple subscription, in case you wish to call the `_initSwiper()` multiple time

		this.swiper.on('slideChange', () => {
			// Any change subscription you wish
			//this.infinitLoad?.triggerOnScroll()

			if (this.swiper.activeIndex === this.swiper.slides.length) {
				this.storageProvider.setHasSeenWalkthrough();
			}
		});
	}

	goToSettings(): void {
		this.storageProvider.setHasSeenWalkthrough();
		this.router.navigate(['/settings']);
	}

	skipWalkthrough(): void {
		// Skip to the last slide
		if (this.swiper) {
			this.storageProvider.setHasSeenWalkthrough();
			this.swiper.slideTo(this.swiper.slides.length - 1);
		}
	}
}
