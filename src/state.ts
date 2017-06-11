'use strict';


import * as vscode from 'vscode';
import * as path from 'path';
import * as mkdirp from 'mkdirp';

import * as helper from './helper';
import {c_cpp_properties} from './c_cpp_properties';



export class CMakeToolsHelper {
    cmakeTools = vscode.extensions.getExtension("vector-of-bool.cmake-tools");

    constructor() {
        this.validateEnvironment();

        const currentCMakeDlPath = vscode.workspace.getConfiguration('cmake-tools-helper').get<string>('cmake_download_path');
        if (currentCMakeDlPath == null) {
            const myDir = vscode.extensions.getExtension("maddouri.cmake-tools-helper").extensionPath;
            const defaultCMakeDlPath = myDir + path.sep + 'cmake_dl';
            mkdirp(defaultCMakeDlPath, err => {
                if (err) {
                    const msg = `Fail: Creation of defaultCMakeDlPath:${defaultCMakeDlPath}`;
                    console.error(msg);
                    vscode.window.showErrorMessage(msg);
                } else {
                    vscode.workspace.getConfiguration('cmake-tools-helper').update('cmake_download_path', defaultCMakeDlPath);
                    console.log(`cmake-tools-helper.cmake_download_path:${defaultCMakeDlPath}`);
                }
            });
        } else {
            console.log(`cmake-tools-helper.cmake_download_path:${currentCMakeDlPath}`);
        }

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
        return this.cmakeTools.exports._backend.then(cmakeToolsWrapper => {

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
            this.cmakeTools.exports._backend.then(cmakeToolsWrapper => {
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

    install_cmake() {
        helper.getRemoteCMakeVersionNames(async (remoteVersions: string[]) => {

            remoteVersions.sort().reverse();
            const versionToDownload = await vscode.window.showQuickPick(remoteVersions, {
                matchOnDescription: true,
                matchOnDetail: true,
                placeHolder: "Choose a CMake version to download and install",
                ignoreFocusOut: true
            });
            if (versionToDownload == null) {
                return null;
            }

            const pathToInstalledCMake = await helper.downloadAndInstallCMake(versionToDownload);
            if (pathToInstalledCMake == null) {
                console.error(`Failed to download CMake ${versionToDownload}`)
                return null;
            }

            const currentCMakePath = vscode.workspace.getConfiguration('cmake').get<string>('cmakePath');
            const msg = `CMake v${versionToDownload} installed in ${pathToInstalledCMake}`;
            console.log(msg);
            const setCMakePath = await vscode.window.showQuickPick([
                {
                    label: 'Yes',
                    description: `Set "cmake.cmakePath": "${pathToInstalledCMake}${path.sep}cmake"`
                }, {
                    label: 'No',
                    description: `Keep "cmake.cmakePath": "${currentCMakePath}"`
                }
            ], {
                matchOnDescription: true,
                matchOnDetail: true,
                placeHolder: "Update cmake.cmakePath ?",
                ignoreFocusOut: true
            });

            if (setCMakePath.label == 'Yes') {
                await vscode.workspace.getConfiguration('cmake').update('cmakePath', `${pathToInstalledCMake}${path.sep}cmake`);
            }
        });
    }
}
