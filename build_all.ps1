# Create a list of commands
$commands = @(
  "ng cache clean",
	"if (Test-Path -Path .\dist) { Remove-Item .\dist\* -Recurse -Force }",
	'if (!(Test-Path -Path ..\.gitignore)) { New-Item ..\.gitignore -ItemType File -Value "*.zip"}',
	"if (Test-Path -Path ..\.autodeploy\bin\imxweb\custom) { Remove-Item ..\.autodeploy\bin\imxweb\custom\* -Recurse -Force }",
	"if (!(Test-Path -Path ..\.autodeploy\bin\imxweb\custom)) { New-Item -Path ..\.autodeploy\bin\imxweb\custom -Type Directory}",
  "npm run build:lib qbm",
  "npm run build:lib qer",
  "npm run build:lib tsb; Compress-Archive -Path .\dist\tsb\* -DestinationPath ..\.autodeploy\bin\imxweb\custom\Html_tsb.zip -Force",
	"npm run build:lib aad; Compress-Archive -Path .\dist\aad\* -DestinationPath ..\.autodeploy\bin\imxweb\custom\Html_aad.zip -Force",
  "npm run build:lib aob; Compress-Archive -Path .\dist\aob\* -DestinationPath ..\.autodeploy\bin\imxweb\custom\Html_aob.zip -Force",
	"npm run build:lib att; Compress-Archive -Path .\dist\att\* -DestinationPath ..\.autodeploy\bin\imxweb\custom\Html_att.zip -Force",
	"npm run build:lib cpl; Compress-Archive -Path .\dist\cpl\* -DestinationPath ..\.autodeploy\bin\imxweb\custom\Html_cpl.zip -Force",
  "npm run build:lib dpr; Compress-Archive -Path .\dist\dpr\* -DestinationPath ..\.autodeploy\bin\imxweb\custom\Html_dpr.zip -Force",
	"npm run build:lib pol; Compress-Archive -Path .\dist\pol\* -DestinationPath ..\.autodeploy\bin\imxweb\custom\Html_pol.zip -Force",
	"npm run build:lib rmb; Compress-Archive -Path .\dist\rmb\* -DestinationPath ..\.autodeploy\bin\imxweb\custom\Html_rmb.zip -Force",
  "npm run build:lib rms; Compress-Archive -Path .\dist\rms\* -DestinationPath ..\.autodeploy\bin\imxweb\custom\Html_rms.zip -Force",
	"npm run build:lib rps; Compress-Archive -Path .\dist\rps\* -DestinationPath ..\.autodeploy\bin\imxweb\custom\Html_rps.zip -Force",
	"npm run build:lib sac; Compress-Archive -Path .\dist\sac\* -DestinationPath ..\.autodeploy\bin\imxweb\custom\Html_sac.zip -Force",
	"npm run build:lib uci; Compress-Archive -Path .\dist\uci\* -DestinationPath ..\.autodeploy\bin\imxweb\custom\Html_uci.zip -Force",
  "npm run build:app qer-app-portal; if (Test-Path -Path .\dist\qer-app-portal\HTML) { Remove-Item -Path .\dist\qer-app-portal\HTML -Recurse -Force }; Compress-Archive -Path .\dist\qer-app-portal\* -DestinationPath ..\.autodeploy\bin\imxweb\custom\Html_qer-app-portal.zip -Force",
  "npm run build:app qbm-app-landingpage; if (Test-Path -Path .\dist\qbm-app-landingpage\HTML) { Remove-Item -Path .\dist\qbm-app-landingpage\HTML -Recurse -Force }; Compress-Archive -Path .\dist\qbm-app-landingpage\* -DestinationPath ..\.autodeploy\bin\imxweb\custom\Html_qbm-app-landingpage.zip -Force",
  "npm run build:app qer-app-operationssupport; if (Test-Path -Path .\dist\qer-app-operationssupport\HTML) { Remove-Item -Path .\dist\qer-app-operationssupport\HTML -Recurse -Force }; Compress-Archive -Path .\dist\qer-app-operationssupport\* -DestinationPath ..\.autodeploy\bin\imxweb\custom\Html_qer-app-operationssupport.zip -Force",
  "npm run build:app qer-app-pwdportal; if (Test-Path -Path .\dist\qer-app-pwdportal\HTML) { Remove-Item -Path .\dist\qer-app-pwdportal\HTML -Recurse -Force }; Compress-Archive -Path .\dist\qer-app-pwdportal\* -DestinationPath ..\.autodeploy\bin\imxweb\custom\Html_qer-app-pwdportal.zip -Force"
)

# Loop through each command and run it
foreach ($command in $commands) {
    Write-Host "Running: $command"
    Invoke-Expression $command
}
