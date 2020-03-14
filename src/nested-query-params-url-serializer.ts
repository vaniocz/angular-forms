import {parse, stringify} from 'qs';
import {DefaultUrlSerializer, UrlSerializer, UrlTree} from '@angular/router';

export class NestedQueryParamsUrlSerializer extends UrlSerializer {
    private defaultUrlSerializer = new DefaultUrlSerializer();

    parse(url: string): UrlTree {
        const urlTree = this.defaultUrlSerializer.parse(url);
        urlTree.queryParams = parse(url.replace(/^[^?]*(\?|$)|#.*/g, ''));

        return urlTree;
    }

    serialize(urlTree: UrlTree): string {
        const url = this.defaultUrlSerializer.serialize(urlTree);

        return url.indexOf('?') === -1 ? url : url.replace(/\?.*(#|$)/, `?${stringify(urlTree.queryParams)}$1`);
    }
}
