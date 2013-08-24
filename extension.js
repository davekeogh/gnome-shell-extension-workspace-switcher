const St = imports.gi.St;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const Lang = imports.lang;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
const PopupMenu = imports.ui.popupMenu;
const Panel = imports.ui.panel;
const Clutter = imports.gi.Clutter;

let indicator;

const WorkspaceChanger = new Lang.Class({
    Name: 'Workspace Changer',
    Extends: PanelMenu.Button,

    _init: function() {
        this.parent(0.0, _('Workspace Changer'));
        this.statusLabel = new St.Label({
            text: (global.screen.get_active_workspace().index() + 1).toString()
        });
        this.actor.add_actor(this.statusLabel);
        this.statusLabel.add_style_class_name('panel-workspace-indicator');
        this.updateMenu();

        this.actor.connect('scroll-event', Lang.bind(this, this.onScrollEvent));
        global.screen.connect('workspace-switched', Lang.bind(this, this.updateIndicator));
    },

    destroy: function() {
        this.parent();
    },

    updateMenu: function() {
        this.menu.removeAll();

        let tracker = Shell.WindowTracker.get_default();

        for (let wks = 0; wks < global.screen.n_workspaces; ++wks) {
            let workspace_name = Meta.prefs_get_workspace_name(wks);
            let metaWorkspace = global.screen.get_workspace_by_index(wks);
            let windows = metaWorkspace.list_windows();
            let sticky_windows = windows.filter(
                function(w) {
                    return !w.is_skip_taskbar() && w.is_on_all_workspaces();
                }
            );
            windows = windows.filter(
                function(w) {
                    return !w.is_skip_taskbar() && !w.is_on_all_workspaces();
                }
            );

            if (sticky_windows.length && (wks == 0)) {
                let item = new PopupMenu.PopupMenuItem('All Workspaces');
                item.actor.add_style_class_name('workspace-title');
                this.menu.addMenuItem(item);

                for (let i = 0; i < sticky_windows.length; ++i) {
                    let metaWindow = sticky_windows[i];
                    let item = new PopupMenu.PopupMenuItem(metaWindow.get_title());

                    item.connect('activate', Lang.bind(this, function() {
                        this.activateWindow(metaWorkspace, metaWindow);
                    }));

                    item._window = sticky_windows[i];
                    let app = tracker.get_window_app(item._window);
                    item._icon = app.create_icon_texture(24);

                    item.addActor(item._icon, {
                        align: St.Align.END
                    });

                    this.menu.addMenuItem(item);
                }
                this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            }

            if (wks > 0) {
                this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            }
            if (global.screen.n_workspaces > 1) {
                let item = new PopupMenu.PopupMenuItem(workspace_name);
                item.actor.add_style_class_name('workspace-title');

                if (wks == global.screen.get_active_workspace().index()) {
                    item.setShowDot(true);
                }

                else {
                    item.connect('activate', Lang.bind(this, function() {
                        this.activateWorkspace(metaWorkspace.index());
                    }));
                }

                this.menu.addMenuItem(item);

                for (let i = 0; i < windows.length; ++i) {
                    let metaWindow = windows[i];
                    let item = new PopupMenu.PopupMenuItem(windows[i].get_title());

                    item.connect('activate', Lang.bind(this, function() {
                        this.activateWindow(metaWorkspace, metaWindow);
                    }));

                    item._window = windows[i];

                    let app = tracker.get_window_app(item._window);
                    item._icon = app.create_icon_texture(24);

                    item.addActor(item._icon, {
                        align: St.Align.END
                    });

                    this.menu.addMenuItem(item);
                }
            }
        }
        
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        
        let item = new PopupMenu.PopupMenuItem('Settings');
        
        item.connect('activate', Lang.bind(this, function() {
            this.activateSettings();
        }));
        
        this.menu.addMenuItem(item);
        
    },
    
    activateSettings: function() {
        let appSys = Shell.AppSystem.get_default();
        let app = appSys.lookup_app('gnome-shell-extension-prefs.desktop');
        app.launch(global.display.get_current_time_roundtrip(),
                   ['extension:///window-workspace-switcher@davekeogh.shaw.ca'], -1, null);
    },

    updateIndicator: function() {
        this.statusLabel.set_text((global.screen.get_active_workspace().index() + 1).toString());
    },

    activateWindow: function(metaWorkspace, metaWindow) {
        if (!metaWindow.is_on_all_workspaces()) {
            metaWorkspace.activate(global.get_current_time());
        }

        metaWindow.unminimize(global.get_current_time());
        metaWindow.activate(global.get_current_time());

        updateIndicator();
    },

    activateWorkspace: function(index) {
        if (index >= 0 && index < global.screen.n_workspaces) {
            let metaWorkspace = global.screen.get_workspace_by_index(index);
            metaWorkspace.activate(global.get_current_time());
        }

        updateIndicator();
    },

    _onButtonPress: function(actor, event) {
        this.updateMenu();
        this.parent(actor, event);
    },

    onScrollEvent: function(actor, event) {
        let direction = event.get_scroll_direction();
        let diff = 0;

        if (direction == Clutter.ScrollDirection.DOWN) {
            diff = 1;
        }
        else if (direction == Clutter.ScrollDirection.UP) {
            diff = -1;
        }
        else {
            return;
        }

        let newIndex = global.screen.get_active_workspace().index() + diff;
        this.activateWorkspace(newIndex);
    }
});

function init() {
    return;
}

function enable() {
    indicator = new WorkspaceChanger();
    Main.panel.addToStatusArea('workspace-changer', indicator);
}

function disable() {
    indicator.destroy();
    indicator = null;
}
