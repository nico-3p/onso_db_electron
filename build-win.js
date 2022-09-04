const builder = require('electron-builder');

builder.build({
    config: {
        'appId': 'com.electron.onso_db',
        'win':{
            'target': {
                'target': 'zip',
                'arch': [
                    'x64',
                    'ia32',
                ]
            }
        }
    }
});