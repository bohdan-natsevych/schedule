; Inno Setup Script for Schedule Manager

#define MyAppName "Schedule Manager"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Schedule Manager Team"
#define MyAppURL "https://github.com/yourusername/schedule"
#define MyAppExeName "ScheduleManager.exe"

[Setup]
AppId={{A9B8C7D6-E5F4-4321-9876-543210ABCDEF}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={commonpf64}\Schedule Manager
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=Output
OutputBaseFilename=ScheduleManagerSetup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64

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
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{localappdata}\Schedule Manager\uploads"
Type: filesandordirs; Name: "{localappdata}\Schedule Manager\backend"
