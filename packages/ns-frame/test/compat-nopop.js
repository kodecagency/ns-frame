// Simula un navegador sin Popover API (Safari < 17, Firefox < 125): se quita antes de cargar los módulos
delete HTMLElement.prototype.showPopover
delete HTMLElement.prototype.hidePopover
delete HTMLElement.prototype.togglePopover
