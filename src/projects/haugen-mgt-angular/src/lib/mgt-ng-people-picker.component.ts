import { Component, ElementRef, EventEmitter, Input, Output } from '@angular/core';
import { IDynamicPerson, MgtPeoplePicker } from '@microsoft/mgt';
import { MgtMsalAngularProvider } from './mgt-ng-auth-provider';

@Component({
    selector: "mgt-ng-people-picker",
    template: ''
})
export class MgtNgPeoplePickerComponent {

    @Output()
    readonly selectedUsersChanged = new EventEmitter<IDynamicPerson[]>();

    private readonly peoplePicker: MgtPeoplePicker;

    constructor(
        mgtMsalAngularProvider: MgtMsalAngularProvider,
        elem: ElementRef<HTMLElement>
    ) {
        mgtMsalAngularProvider.registerAsDefault();

        this.peoplePicker = new MgtPeoplePicker();

        this.peoplePicker.addEventListener('selectionChanged', () => {
            this.selectedUsersChanged.emit(this.selectedUsers);
        });

        elem.nativeElement.append(this.peoplePicker);
    }

    @Input()
    set selectedUsers(val: IDynamicPerson[]) {

        if (this.peoplePicker.selectedPeople && this.peoplePicker.selectedPeople.length === val.length) {
            let same = true;
            for (let i = 0; i < val.length; i++) {
                if (val[i].id !== this.peoplePicker.selectedPeople[i].id) {
                    same = false;
                    break;
                }
            }

            if (same) {
                return;
            }
        }

        this.peoplePicker.selectedPeople = val;
    }
    get selectedUsers() {
        return this.peoplePicker.selectedPeople;
    }

    @Input()
    set userIds(val: string[]) {
        this.peoplePicker.selectUsersById(val as any);
    }
}
