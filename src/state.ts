'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import 'proxy-observe';  // will add observe() to Object

import * as helper from './helper';
import {c_cpp_properties} from './c_cpp_properties';



export class CMakeToolsHelper {
    cmakeTools = vscode.extensions.getExtension("vector-of-bool.cmake-tools");

    constructor() {
        this.validateEnvironment();

        const onChange = () => this.update_cpptools();

        // update on build config change
        this.cmakeTools.exports.reconfigured(() => {
            onChange();
        });
        // update on default target change
        this.cmakeTools.exports.targetChangedEvent(() => {
            onChange();
        });

        // first update
        onChange();
    }

    validateEnvironment() {
        if (!this.cmakeTools.isActive) {
            const msg = 'CMake Tools is not active';
            console.error(msg);
            vscode.window.showErrorMessage(msg);
        }
        if (!vscode.workspace.getConfiguration('cmake').get<boolean>('useCMakeServer')) {
            const msg = 'Please set \'cmake.useCMakeServer\' to \'true\'';
            console.error(msg);
            vscode.window.showErrorMessage(msg);
        }
    }

    activeCMakeConfigName()
    {
        return this.cmakeTools.exports._impl.then(cmakeToolsWrapper => {

            // cmakeTools.exports         : CMakeToolsWrapper
            // cmakeToolsWrapper          : CMakeToolsWrapper
            // cmakeToolsWrapper.codeModel: CodeModelContent

            if (cmakeToolsWrapper == null) {
                return new Promise<string>(resolve => resolve(helper.makeConfigName(null, null, null)));
            }

            const codeModel           = cmakeToolsWrapper.codeModel;
            const configs             = (codeModel != null)
                                      ? codeModel.configurations  // CodeModelConfiguration
                                      : null;
            //const activeGenerator     = cmakeToolsWrapper.activeGenerator;
            const activeTargetName    = cmakeToolsWrapper.defaultBuildTarget;
            const activeBuiltTypeName = cmakeToolsWrapper.selectedBuildType;
            const activeConfig        = (configs != null)
                                      ? configs.find(c => (c.name == activeBuiltTypeName))
                                      : null;
            const activeProject       = (activeConfig != null)
                                      ? activeConfig.projects.find(p => (typeof p.targets.find(t => (t.name == activeTargetName)) !== 'undefined'))  // CodeModelProject
                                      : null;
            //const activeTarget        = activeProject != null
            //                          ? activeProject.targets.find(t => (t.name == activeTargetName)) // CodeModelTarget
            //                          : null;
            const activeProjectName   = (activeProject != null)
                                      ? activeProject.name
                                      : null;

            return new Promise<string>(resolve => resolve(helper.makeConfigName(activeProjectName, activeTargetName, activeBuiltTypeName)));
        });
    }

    updateCppTools() {
        this.activeCMakeConfigName().then(activeConfigName => {
            this.cmakeTools.exports._impl.then(cmakeToolsWrapper => {
                // get all the configs
                const codeModel    = cmakeToolsWrapper.codeModel;
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
