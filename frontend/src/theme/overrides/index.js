import merge from 'lodash.merge';

import { fab } from './components/fab';
import { menu } from './components/menu';
import { chip } from './components/chip';
import { card } from './components/card';
import { tabs } from './components/tabs';
import { list } from './components/list';
import { radio } from './components/radio';
import { badge } from './components/badge';
import { table } from './components/table';
import { alert } from './components/alert';
import { paper } from './components/paper';
import { select } from './components/select';
import { slider } from './components/slider';
import { avatar } from './components/avatar';
import { drawer } from './components/drawer';
import { appBar } from './components/appbar';
import { dialog } from './components/dialog';
import { rating } from './components/rating';
import { button } from './components/button';
import { popover } from './components/popover';
import { switches } from './components/switch';
import { defaultProps } from './default-props';
import { tooltip } from './components/tooltip';
import { stepper } from './components/stepper';
import { svgIcon } from './components/svg-icon';
import { timeline } from './components/timeline';
import { backdrop } from './components/backdrop';
import { skeleton } from './components/skeleton';
import { progress } from './components/progress';
import { checkbox } from './components/checkbox';
import { dataGrid } from './components/data-grid';
import { treeView } from './components/tree-view';
import { textField } from './components/textfield';
import { accordion } from './components/accordion';
import { typography } from './components/typography';
import { pagination } from './components/pagination';
import { datePicker } from './components/date-picker';
import { breadcrumbs } from './components/breadcrumbs';
import { cssBaseline } from './components/css-baseline';
import { buttonGroup } from './components/button-group';
import { autocomplete } from './components/autocomplete';
import { toggleButton } from './components/toggle-button';
import { loadingButton } from './components/loading-button';

// ----------------------------------------------------------------------

export function componentsOverrides(theme) {
  const components = merge(
    defaultProps(theme),
    //
    fab(theme),
    tabs(theme),
    chip(theme),
    card(theme),
    menu(theme),
    list(theme),
    badge(theme),
    table(theme),
    paper(theme),
    alert(theme),
    radio(theme),
    select(theme),
    button(theme),
    rating(theme),
    dialog(theme),
    appBar(theme),
    avatar(theme),
    slider(theme),
    drawer(theme),
    stepper(theme),
    tooltip(theme),
    popover(theme),
    svgIcon(theme),
    switches(theme),
    checkbox(theme),
    dataGrid(theme),
    skeleton(theme),
    timeline(theme),
    treeView(theme),
    backdrop(theme),
    progress(theme),
    textField(theme),
    accordion(theme),
    typography(theme),
    pagination(theme),
    datePicker(theme),
    buttonGroup(theme),
    breadcrumbs(theme),
    cssBaseline(theme),
    autocomplete(theme),
    toggleButton(theme),
    loadingButton(theme)
  );

  return components;
}
