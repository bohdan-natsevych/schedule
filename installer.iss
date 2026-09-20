; Per-user installer for Schedule Manager. Built by .github/workflows/release.yml.
; AppVersion is supplied on the command line: iscc /DAppVersion=1.0.2 installer.iss

#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif

#define MyAppName "Schedule Manager"
#define MyAppPublisher "Schedule Manager Team"
#define MyAppURL "https://github.com/bohdan-natsevych/schedule"
#define MyAppExeName "ScheduleManager.exe"
#define DataDirName "ScheduleManager"
#define LegacyDataDirName "Schedule Manager"

; CLAUDE CODE: AppId of the per-machine installs up to 1.0.1. It is only ever
; read, never registered - the per-user product below has its own AppId so the
; two can never be mistaken for one another.
#define LegacyAppId "{A9B8C7D6-E5F4-4321-9876-543210ABCDEF}"

[Setup]
AppId={{7C4F2E19-3A8D-4B6E-9F02-5D1C8A3B7E64}
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

[Code]
// Installs up to 1.0.1 were per-machine and kept the database, the uploads and
// the Google sign-in in LocalAppData\Schedule Manager - a folder their own
// uninstaller deletes. Setup therefore moves that folder out of reach before it
// offers to remove the old version, and refuses to run that uninstaller if the
// move did not succeed.

const
  LegacyUninstallKey =
    'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{#LegacyAppId}_is1';
  UninstallArguments = '/VERYSILENT /SUPPRESSMSGBOXES /NORESTART';
  UninstallPollLimit = 120;
  RobocopySuccessLimit = 8;

var
  LegacyUninstaller: String;
  LegacyLocation: String;
  LegacyVersion: String;
  LegacyPage: TInputOptionWizardPage;

function ReadLegacyValue(const Name: String; var Value: String): Boolean;
begin
  Result := RegQueryStringValue(HKLM64, LegacyUninstallKey, Name, Value) or
            RegQueryStringValue(HKLM32, LegacyUninstallKey, Name, Value);
end;

// An UninstallString is a command line, not a path: it may be quoted and may
// carry switches.
function UninstallerFromCommand(const Command: String): String;
var
  Rest: String;
  Quote: Integer;
begin
  Result := '';
  Rest := Trim(Command);
  if Rest = '' then
    Exit;

  if Rest[1] = '"' then
  begin
    Rest := Copy(Rest, 2, Length(Rest) - 1);
    Quote := Pos('"', Rest);
    if Quote > 1 then
      Result := Copy(Rest, 1, Quote - 1);
  end
  else
  begin
    Quote := Pos(' /', Rest);
    if Quote > 0 then
      Result := Trim(Copy(Rest, 1, Quote - 1))
    else
      Result := Rest;
  end;
end;

function DetectLegacyInstall(): Boolean;
var
  Command: String;
begin
  LegacyUninstaller := '';
  LegacyLocation := '';
  LegacyVersion := '';

  ReadLegacyValue('InstallLocation', LegacyLocation);
  ReadLegacyValue('DisplayVersion', LegacyVersion);

  if ReadLegacyValue('UninstallString', Command) then
    LegacyUninstaller := UninstallerFromCommand(Command);
  if (LegacyUninstaller <> '') and not FileExists(LegacyUninstaller) then
    LegacyUninstaller := '';
  if (LegacyUninstaller = '') and (LegacyLocation <> '') then
    if FileExists(AddBackslash(LegacyLocation) + 'unins000.exe') then
      LegacyUninstaller := AddBackslash(LegacyLocation) + 'unins000.exe';

  Result := LegacyUninstaller <> '';
end;

function DataDir(): String;
begin
  Result := ExpandConstant('{localappdata}\{#DataDirName}');
end;

function LegacyDataDir(): String;
begin
  Result := ExpandConstant('{localappdata}\{#LegacyDataDirName}');
end;

// Returns True when nothing of the user's is left where the old uninstaller
// would delete it. A rename is instant and atomic on the same volume; robocopy
// /MOVE is the fallback when a file is locked.
function MoveLegacyData(): Boolean;
var
  ResultCode: Integer;
begin
  Result := True;
  if not DirExists(LegacyDataDir()) then
    Exit;

  if not DirExists(DataDir()) then
    if RenameFile(LegacyDataDir(), DataDir()) then
      Exit;

  ForceDirectories(DataDir());
  if not Exec(ExpandConstant('{sys}\robocopy.exe'),
              '"' + LegacyDataDir() + '" "' + DataDir() + '" /E /MOVE /NFL /NDL /NJH /NJS /R:1 /W:1',
              '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    Result := False;
    Exit;
  end;

  // robocopy reports 0-7 for success; 8 and above mean files were left.
  Result := (ResultCode < RobocopySuccessLimit) and not DirExists(LegacyDataDir());
end;

// The per-machine install kept these next to its executable, which its own
// uninstaller deletes.
procedure AdoptLegacyCredentials();
var
  Names: array[0..1] of String;
  Source, Target: String;
  I: Integer;
begin
  if LegacyLocation = '' then
    Exit;

  Names[0] := 'google_credentials.json';
  Names[1] := 'google_token.pickle';
  ForceDirectories(DataDir());

  for I := 0 to 1 do
  begin
    Source := AddBackslash(LegacyLocation) + Names[I];
    Target := AddBackslash(DataDir()) + Names[I];
    if FileExists(Source) and not FileExists(Target) then
      CopyFile(Source, Target, False);
  end;
end;

function RemoveLegacyInstall(): Boolean;
var
  ResultCode, Waited: Integer;
  Command: String;
begin
  Result := False;
  if not ShellExec('runas', LegacyUninstaller, UninstallArguments,
                   ExtractFileDir(LegacyUninstaller), SW_SHOW,
                   ewWaitUntilTerminated, ResultCode) then
    Exit;

  // unins000.exe copies itself to the temp folder and returns at once, so
  // waiting on the process proves nothing. The registry entry disappearing is
  // what says the uninstall finished.
  Waited := 0;
  while (Waited < UninstallPollLimit) and ReadLegacyValue('UninstallString', Command) do
  begin
    Sleep(500);
    Waited := Waited + 1;
  end;

  Result := not ReadLegacyValue('UninstallString', Command);
end;

procedure InitializeWizard();
var
  Description: String;
begin
  LegacyPage := nil;
  if not DetectLegacyInstall() then
    Exit;

  Description :=
    'Schedule Manager ' + LegacyVersion + ' is already installed in ' +
    LegacyLocation + '.' + #13#10#13#10 +
    'Your schedule, images and Google sign-in move to the new location either ' +
    'way, because the older version deletes them when it is uninstalled. ' +
    'Windows will ask for permission to remove it.';

  LegacyPage := CreateInputOptionPage(wpWelcome,
    'Earlier version found', 'Setup can replace the version already installed.',
    Description, True, False);
  LegacyPage.Add('Update: move my data, remove version ' + LegacyVersion +
    ', and install {#AppVersion}');
  LegacyPage.Add('Install {#AppVersion} and leave version ' + LegacyVersion +
    ' listed in Apps ' + '&' + '&' + ' features');
  LegacyPage.SelectedValueIndex := 0;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  Moved: Boolean;
begin
  if CurStep <> ssInstall then
    Exit;

  Moved := MoveLegacyData();
  AdoptLegacyCredentials();

  if not Moved then
  begin
    // Removing the old version now would delete what could not be moved.
    if not WizardSilent then
      MsgBox('Setup could not move the data in ' + LegacyDataDir() + '.' + #13#10 +
             'The new version is still installed and reads that folder on its ' +
             'first start, but the older version has been left in place so ' +
             'that nothing is deleted.', mbError, MB_OK);
    Exit;
  end;

  // A silent run is an in-app update, where a UAC prompt would stall unattended.
  if WizardSilent or (LegacyPage = nil) or (LegacyPage.SelectedValueIndex <> 0) then
    Exit;

  if not RemoveLegacyInstall() then
    MsgBox('Version ' + LegacyVersion + ' was not removed. Your data has been ' +
           'moved, so it is safe to uninstall it from Apps ' + '&' + '& features ' +
           'at any time.', mbInformation, MB_OK);
end;
