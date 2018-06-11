import { onTouchStart, onTouchEnd, onTouchCancel } from 'iwe7-util';
import { Directive, ElementRef, EventEmitter, Output, Input, NgZone, Renderer2 } from '@angular/core';
import { interval, merge } from 'rxjs';
import { switchMap, takeUntil, tap, map, filter, take, takeWhile } from 'rxjs/operators';

@Directive({
    selector: '[ngPress]',
    exportAs: 'ngPress'
})
export class OnPressDirective {
    @Output() ngPress: EventEmitter<number> = new EventEmitter();
    @Output() ngRelease: EventEmitter<number> = new EventEmitter();
    @Output() ngPressing: EventEmitter<number> = new EventEmitter();
    @Input() start: number = 10;
    @Input() step: number = 100;

    hasPrese: boolean = false;
    constructor(
        public ele: ElementRef,
        public ngZone: NgZone,
        public render: Renderer2
    ) { }
    ngAfterViewInit() {
        this.ngZone.runOutsideAngular(() => {
            const touchStart$ = onTouchStart(this.ele.nativeElement);
            const touchEnd$ = onTouchEnd(this.ele.nativeElement);
            const touchCancel$ = onTouchCancel(this.ele.nativeElement);

            this.ngRelease.subscribe(res => {
                this.render.addClass(this.ele.nativeElement, 'ng-press-disabled');
                setTimeout(() => {
                    this.hasPrese = false;
                    this.render.removeClass(this.ele.nativeElement, 'ng-press-disabled');
                }, 200);
            });

            const touchCancelOrEnd$ = merge(
                touchEnd$,
                touchCancel$
            ).pipe(
                tap(res => res.preventDefault()),
                tap(res => res.stopPropagation()),
                take(1));

            this.ngPress.pipe(
                tap(res => this.hasPrese = true),
                map(res => 0),
                switchMap(res => {
                    return interval(100).pipe(
                        takeUntil(touchCancelOrEnd$),
                        map(res => res++),
                        tap(res => {
                            this.ngZone.run(() => {
                                this.ngPressing.emit(res / 10);
                            });
                        })
                    );
                })
            ).subscribe();
            touchStart$.pipe(
                tap(res => res.preventDefault()),
                tap(res => res.stopPropagation()),
                // 初始化时间为0
                map((e: TouchEvent) => 0),
                // 防止重复触发
                filter(res => !this.hasPrese),
                switchMap(pressTime => {
                    // 开始计时
                    touchCancelOrEnd$.pipe(
                        takeWhile(res => this.hasPrese)
                    ).subscribe(res => {
                        // 释放 超过1秒可以触发释放
                        this.ngZone.run(() => {
                            this.ngRelease.emit();
                        });
                    });
                    // 开始计时
                    return interval(100).pipe(
                        // touchEnd结束
                        takeUntil(
                            touchCancelOrEnd$
                        ),
                        map(res => {
                            return pressTime++;
                        }),
                        // 触发press
                        filter(res => res > this.start),
                        take(1),
                        tap(res => {
                            this.ngZone.run(() => {
                                this.hasPrese = true;
                                this.ngPress.emit();
                            });
                        })
                    );
                })
            ).subscribe();
        });
    }
}
