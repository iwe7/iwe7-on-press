import { onTouchStart, onTouchEnd, onTouchCancel } from 'iwe7-util';
import { Directive, ElementRef, EventEmitter, Output, Input, NgZone } from '@angular/core';
import { interval, merge } from 'rxjs';
import { switchMap, takeUntil, tap, map, filter, take, takeWhile } from 'rxjs/operators';

@Directive({ selector: '[ngPress]' })
export class OnPressDirective {
    @Output() ngPress: EventEmitter<number> = new EventEmitter();
    @Output() ngRelease: EventEmitter<number> = new EventEmitter();
    @Output() ngPressing: EventEmitter<number> = new EventEmitter();
    @Input() start: number = 10;
    @Input() step: number = 100;

    hasPrese: boolean = false;
    constructor(public ele: ElementRef, public ngZone: NgZone) { }
    ngAfterViewInit() {
        this.ngZone.runOutsideAngular(() => {
            const touchStart$ = onTouchStart(this.ele.nativeElement);
            const touchEnd$ = onTouchEnd(this.ele.nativeElement);
            const touchCancel$ = onTouchCancel(this.ele.nativeElement);
            const touchCancelOrEnd$ = merge(touchEnd$, touchCancel$).pipe(take(1));
            // 开始计时
            touchCancelOrEnd$.pipe(
                takeWhile(res => this.hasPrese)
            ).subscribe(res => {
                // 释放 超过1秒可以触发释放
                this.ngZone.run(() => {
                    this.ngRelease.emit();
                });
            });
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
                switchMap(pressTime => {
                    // 开始计时
                    return interval(100).pipe(
                        // touchEnd结束
                        takeUntil(
                            merge(touchEnd$, touchCancel$)
                        ),
                        map(res => {
                            return pressTime++;
                        }),
                        // 触发press
                        filter(res => res > this.start),
                        take(1),
                        tap(res => {
                            this.ngZone.run(() => {
                                this.ngPress.emit();
                            });
                        })
                    );
                })
            ).subscribe();
        });
    }
}
