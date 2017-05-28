'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as hooks from 'hooks';
import 'proxy-observe';  // will add observe() to Object

import * as helper from './helper';
import {c_cpp_properties} from './c_cpp_properties';



export class CMakeToolsHelper {
    cmakeTools         = vscode.extensions.getExtension("vector-of-bool.cmake-tools");
    cmakeToolsWatcher  = vscode.workspace.createFileSystemWatcher(
        path.join(helper.vscodeFolderPath(), '.cmaketools.json')
    );

    constructor() {
        const onChange = (_?) => this.update_cpptools();

        // update on build type/config change
        this.cmakeToolsWatcher.onDidChange(onChange);
        this.cmakeToolsWatcher.onDidCreate(onChange);
        this.cmakeToolsWatcher.onDidDelete(onChange);

        // update on target change
        this.cmakeTools.exports._impl.then(cmakeToolsWrapper => {
            // (Object as any) is for ignoring the error on observe() not being found (even though it has been added by 'proxy-observe')
            cmakeToolsWrapper._statusBar = (Object as any).observe(cmakeToolsWrapper._statusBar, function(changeset) {
                // lol it works :D
                onChange();
            });
        });

        // first update
        onChange();
    }

    activeCMakeConfigName()
    {
        return this.cmakeTools.exports._impl.then(cmakeToolsWrapper => {

            // cmakeTools.exports          : CMakeToolsWrapper
            // cmakeToolsWrapper           : CMakeToolsWrapper
            // cmakeToolsWrapper._codeModel: CodeModelContent

            const codeModel           = cmakeToolsWrapper._codeModel;
            const configs             = ((typeof codeModel === 'undefined') || (codeModel == null))
                                      ? null
                                      : codeModel.configurations;  // CodeModelConfiguration
            const activeGenerator     = cmakeToolsWrapper.activeGenerator;
            const activeTargetName    = cmakeToolsWrapper.defaultBuildTarget;
            const activeBuiltTypeName = cmakeToolsWrapper.selectedBuildType;
            const activeConfig        = ((typeof configs === 'undefined') || (configs == null))
                                      ? null
                                      : configs.find(c => (c.name == activeBuiltTypeName));
            const activeProject       = ((typeof activeConfig === 'undefined') || (activeConfig == null))
                                      ? null
                                      : activeConfig.projects.find(p => (typeof p.targets.find(t => (t.name == activeTargetName)) !== 'undefined'));  // CodeModelProject
            //const activeTarget        = typeof activeProject !== 'undefined'
            //                          ? activeProject.targets.find(t => (t.name == activeTargetName))
            //                          : undefined;  // CodeModelTarget
            const activeProjectName   = activeProject == null ? null : activeProject.name;

            return new Promise<string>(resolve => resolve(helper.makeConfigName(activeProjectName, activeTargetName, activeBuiltTypeName)));
        });
    }

    updateCppTools() {
        this.activeCMakeConfigName().then(activeConfigName => {
            this.cmakeTools.exports._impl.then(cmakeToolsWrapper => {
                // get all the configs
                const codeModel    = cmakeToolsWrapper._codeModel;
                const cmakeConfigs = ((typeof codeModel === 'undefined') || (codeModel == null))
                                   ? null
                                   : codeModel.configurations;  // CodeModelConfiguration
                let   props        = new c_cpp_properties(cmakeConfigs);

                // place the active config at the beginning of the array
                let   vscConfigs      = props.configurations;
                const activeConfigIdx = vscConfigs.findIndex(cfg => cfg.name == activeConfigName);
                let   activeConfig    = vscConfigs.splice(activeConfigIdx, 1)[0];
                vscConfigs.splice(0, 0, activeConfig);

                // @see this method's code and comments
                props.writeFile();
            });
        });
    }

    show_active_cmake_config_name() {
        try {
            this.activeCMakeConfigName().then(cfgName => vscode.window.showInformationMessage(`Active CMake Configuration [${cfgName}]`));
        } catch (e) {
            console.log(e);
        }
    }

    update_cpptools() {
        try {
            this.updateCppTools();
        } catch (e) {
            console.log(e);
        }
    }
}
