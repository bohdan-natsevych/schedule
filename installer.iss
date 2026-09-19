; Per-user installer for Schedule Manager. Built by .github/workflows/release.yml.
; AppVersion is supplied on the command line: iscc /DAppVersion=1.0.2 installer.iss

#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif

#define MyAppName "Schedule Manager"
#define MyAppPublisher "Schedule Manager Team"
#define MyAppURL "https://github.com/bohdan-natsevych/schedule"
#define MyAppExeName "ScheduleManager.exe"

[Setup]
AppId={{A9B8C7D6-E5F4-4321-9876-543210ABCDEF}
AppName={#MyAppName}
AppVersion={#AppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={localappdata}\Programs\ScheduleManager
DefaultGroupName={#MyAppName}
DisableDirPage=yes
DisableProgramGroupPage=yes
AllowNoIcons=yes
PrivilegesRequired=lowest
OutputDir=Output
OutputBaseFilename=ScheduleManager-Setup
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=yes
RestartApplications=no
UninstallDisplayName={#MyAppName}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "dist\ScheduleManager\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; CURSOR: Only include google_credentials.json if it exists (users must provide their own)
Source: "google_credentials.json"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{userdesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
; CLAUDE CODE: this entry must stay unskipped in silent mode - the in-app updater
; installs silently and expects the application to come back by itself.
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall runasoriginaluser
