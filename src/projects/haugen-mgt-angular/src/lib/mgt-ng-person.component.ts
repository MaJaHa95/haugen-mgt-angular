import { Component, ElementRef, Inject, Input } from '@angular/core';
import { IDynamicPerson, IProvider, MgtPerson, PersonCardInteraction, PersonViewType, Providers } from '@microsoft/mgt';
import { PROVIDER_TOKEN } from './provider-token';

@Component({
    selector: 'mgt-ng-person',
    template: ''
})
export class MgtNgPersonComponent {

    private readonly mgtPerson: MgtPerson;

    constructor(
        elem: ElementRef<HTMLElement>,
        @Inject(PROVIDER_TOKEN) provider: IProvider
    ) {
        Providers.globalProvider = provider;

        this.mgtPerson = new MgtPerson();
        this.mgtPerson.view = PersonViewType.twolines;
        this.mgtPerson.personCardInteraction = PersonCardInteraction.hover;
        this.mgtPerson.showPresence = true;
        this.mgtPerson.fetchImage = true;

        elem.nativeElement.append(this.mgtPerson);
    }

    @Input()
    set user(val: IDynamicPerson) {
        this.mgtPerson.personDetails = val;
    }

    @Input()
    set userId(val: string) {
        this.mgtPerson.userId = val;
    }

    @Input()
    set personQuery(val: string) {
        this.mgtPerson.personQuery = val;
    }

    @Input()
    set view(val: PersonViewType | keyof typeof PersonViewType) {
        if (typeof(val) === 'string') {
            val = PersonViewType[val];
        }

        this.mgtPerson.view = val;
    }

    @Input()
    set showPresence(val: boolean) {
        this.mgtPerson.showPresence = val;
    }

    @Input()
    set personCard(val: PersonCardInteraction | keyof typeof PersonCardInteraction) {
        if (typeof(val) === 'string') {
            val = PersonCardInteraction[val];
        }

        this.mgtPerson.personCardInteraction = val;
    }
}
