# CMake Tools Helper

[![Version](http://vsmarketplacebadge.apphb.com/version/maddouri.cmake-tools-helper.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=maddouri.cmake-tools-helper) [![Installs](http://vsmarketplacebadge.apphb.com/installs/maddouri.cmake-tools-helper.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=maddouri.cmake-tools-helper) [![Ratings](https://vsmarketplacebadge.apphb.com/rating/maddouri.cmake-tools-helper.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=maddouri.cmake-tools-helper)

[![Dependencies Status](https://david-dm.org/maddouri/vscode-cmake-tools-helper/status.svg?style=flat-square)](https://david-dm.org/maddouri/vscode-cmake-tools-helper) [![DevDependencies Status](https://david-dm.org/maddouri/vscode-cmake-tools-helper/dev-status.svg?style=flat-square)](https://david-dm.org/maddouri/vscode-cmake-tools-helper?type=dev)


This extension helps to bridge a gap between 2 great extensions:

* [C/C++ (`ms-vscode.cpptools`)](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) by Microsoft: Provides C and C++ language support (auto-completion, go to definition, etc.)
* [CMake Tools (`vector-of-bool.cmake-tools`)](https://marketplace.visualstudio.com/items?itemName=vector-of-bool.cmake-tools) by vector-of-bool: Provides support for CMake-based projects (configure, build, etc.)

[CMake Tools Helper](https://marketplace.visualstudio.com/items?itemName=maddouri.cmake-tools-helper) enables cpptools to **automatically** know the information parsed by CMake Tools (such as **include directories** and **defines**) and use it to provide auto-completion, go to definition, etc.

## Features

* Automatically updates cpptools' `c_cpp_properties.json` with the current CMake target's information (**build type**, **include directories** and **defines**)
* Automatically updates cpptools' active configuration to match CMake Tools' active configuration and target

## Why

In order to provide some its features, cpptools relies on a JSON file (`c_cpp_properties.json`) that contains project-related information such as include paths and defines.

At the same time, CMake Tools parses the project's CMake files and extracts all the information that is needed to build it (e.g. compiler flags, includes, defines, etc.) and stores it in another JSON file. (`.cmaketools.json`)

Currently, (I mean... before this extension was released :wink: ) there is no way for cpptools to automatically benefit from what CMake Tools knows -- i.e. The users have to manually copy the include paths and defines from their CMake files (or CMake Tools' `.cmaketools.json`) to `c_cpp_properties.json`.

Having found nothing to do the above automatically, I decided to create this extension!

Please note that discussions were started at https://github.com/vector-of-bool/vscode-cmake-tools/issues/22 and https://github.com/Microsoft/vscode-cpptools/issues/156 to try to address the issue, but AFAIK there is nothing concrete yet.


## How Does It Work

This extension's code is not too long to go over, but the short answer is: Ugly hacks, sweat and tears.

#### Getting the Information from CMake Tools

A combination of:

* `vscode.extensions.getExtension("vector-of-bool.cmake-tools").exports`: Allows getting the name of the currently-selected build target as well as the list of valid CMake configurations
* A file watcher on `.cmaketools.json`: CMake Tools updates this file after (re)configuring the project (first config, change of build type, etc.) so it can be used to get notified when the config changes
* An [observer](https://www.npmjs.com/package/proxy-observe) on the status bar element that CMake tools uses to display the active build target: As of CMake Tools v0.9.4, this is the only way/hack I found in order to be notified when the build target changes

#### Mirroring the Information in cpptools

Each time CMake Tools Helper is notified, the following happens:

1. CMake Tools Helper
    1. Gets the current configuration and target name from CMake Tools
    2. Overrides the content of `c_cpp_properties.json` using the information from step 1
1. VSCode notifies cpptools that `c_cpp_properties.json` has changed (as of cpptools v0.11.2 has a file watcher on it)
1. cpptools:
    1. Parses `c_cpp_properties.json`
    1. Finds a single configuration (the one that mirrors CMake Tools' current configuration)
    1. Uses this configuration as the active one
    1. Generates all bells and whistles for your C or C++ project

## Limitations / Known Issues

1. In order force cpptools to use CMake Tools' current configuration, at any given point in time, only that configuration is present in `c_cpp_properties.json`. This is a workaround to the fact that cpptools doesn't export any API that other extensions could use to interact with it. This particular solution was inspired by the implementation of `handleConfigurationChange` (`ms-vscode.cpptools-0.11.2/out/src/LanguageServer/C_Cpp_ConfigurationProperties.js`)
1. The "all" target is not handled and selecting it results in a "null" configuration in `c_cpp_properties.json`
1. I use and test this extension exclusively in an up-to-date version of VSCode **Insiders**
