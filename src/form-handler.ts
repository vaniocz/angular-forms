import {EMPTY, Observable, of} from 'rxjs';
import {distinctUntilChanged, filter, flatMap, map, skip, startWith, takeUntil} from 'rxjs/operators';
import {Constructor, deserialize, serialize} from 'serialize-ts';
import {Injectable, Type} from '@angular/core';
import {FormGroup} from '@angular/forms';
import {Event, NavigationEnd, Router, UrlTree} from '@angular/router';

interface SubscribeOptions<T extends object> {
    modelClass?: Constructor<T>;
    queryParameterName?: string;
    subscribeAcrossRoutedComponentChange?: boolean;
}

interface SubmitOptions<T extends object> {
    url?: UrlTree | string;
    modelClass?: Constructor<T>;
    queryParameterName?: string;
}

@Injectable({providedIn: 'root'})
export class FormHandler {
    public constructor(private router: Router) {}

    public bindQueryParams<T extends object>(
        formGroup: FormGroup,
        options?: SubscribeOptions<T>,
    ): Observable<{[name: string]: any} | T> {
        const route = this.router.routerState.root;
        const modelValueChanges$ = route.queryParamMap.pipe(
            flatMap(() => {
                let queryParams = route.snapshot.queryParams;

                if (options?.queryParameterName) {
                    queryParams = queryParams[options?.queryParameterName];
                }

                let isSubmitted = false;
                let value: {[property: string]: any} = {};

                for (const name of Object.keys(formGroup.controls)) {
                    if (name in queryParams) {
                        value[name] = queryParams[name];
                        isSubmitted = true;
                    }
                }

                if (options?.modelClass) {
                    value = deserialize(value, options?.modelClass);
                }

                formGroup.patchValue(value);

                return isSubmitted ? of(value) : EMPTY;
            }),
        );

        if (!options?.subscribeAcrossRoutedComponentChange) {
            const routedComponentChange$ = this.router.events.pipe(
                filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd),
                map((event: NavigationEnd) => this.getCurrentRoutedComponent()),
                startWith(this.getCurrentRoutedComponent()),
                distinctUntilChanged(),
                skip(1),
            );

            return modelValueChanges$.pipe(takeUntil(routedComponentChange$));
        }

        return modelValueChanges$;
    }

    public submit<T extends object>(formGroup: FormGroup, options?: SubmitOptions<T>): void {
        let value;

        if (options?.modelClass) {
            value = Object.create(options?.modelClass.prototype);
            Object.assign(value, formGroup.value);
            value = serialize(value);
        } else {
            value = formGroup.value;
        }

        const urlTree =
            options?.url instanceof UrlTree
                ? options.url
                : this.router.createUrlTree([options?.url ?? this.router.url.replace(/\?.*|#.*/g, '')]);

        if (options?.queryParameterName) {
            urlTree.queryParams[options.queryParameterName] = value;
        } else {
            Object.assign(urlTree.queryParams, value);
        }

        this.router.navigateByUrl(urlTree);
    }

    private getCurrentRoutedComponent(): Type<any> | string | null {
        let state = this.router.routerState.root;

        while (state.firstChild) {
            state = state.firstChild;
        }

        return state.component;
    }
}
