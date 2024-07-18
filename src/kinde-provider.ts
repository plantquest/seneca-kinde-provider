/* Copyright © 2021 Seneca Project Contributors, MIT License. */


// TODO: namespace provider zone; needs seneca-entity feature

import { Octokit } from '@octokit/rest'

require("dotenv").config();

const {KindeClient, GrantType} = require("@kinde-oss/kinde-nodejs-sdk");

type KindeProviderOptions = {}


/* Repo ids are of the form 'owner/name'. The internal kinde id field is
 * moved to kinde_id.
 *
 *
 */


function KindeProvider(this: any, _options: any) {
  const seneca: any = this

  const ZONE_BASE = 'provider/kinde/'

  let octokit: Octokit


  // NOTE: sys- zone prefix is reserved.

  seneca
    .message('sys:provider,provider:kinde,get:info', get_info)
    .message('role:entity,cmd:load,zone:provider,base:kinde,name:repo',
      load_repo)

    .message('role:entity,cmd:save,zone:provider,base:kinde,name:repo',
      save_repo)



  async function get_info(this: any, _msg: any) {
    return {
      ok: true,
      name: 'kinde',
      details: {
        sdk: '@octokit/rest'
      }
    }
  }

  async function load_repo(this: any, msg: any) {
    let ent: any = null

    let q: any = msg.q
    let [ownername, reponame]: [string, string] = q.id.split('/')

    let res = await octokit.rest.repos.get({
      owner: ownername,
      repo: reponame,
    })

    if (res && 200 === res.status) {
      let data: any = res.data
      data.kinde_id = data.id
      data.id = q.id
      ent = this.make$(ZONE_BASE + 'repo').data$(data)
    }

    return ent
  }


  async function save_repo(this: any, msg: any) {
    let ent: any = msg.ent

    let [ownername, reponame]: [string, string] = ent.id.split('/')

    let data = {
      owner: ownername,
      repo: reponame,
      description: ent.description
    }

    let res = await octokit.rest.repos.update(data)

    if (res && 200 === res.status) {
      let data: any = res.data
      data.kinde_id = data.id
      data.id = ownername + '/' + reponame
      ent = this.make$(ZONE_BASE + 'repo').data$(data)
    }

    return ent
  }



  seneca.prepare(async function(this: any) {
    let out = await this.post('sys:provider,get:key,provider:kinde,key:api')
    if (!out.ok) {
      this.fail('api-key-missing')
    }

    let config = {
      auth: out.value
    }

    octokit = new Octokit(config)
  })


  return {
    exports: {
      native: () => ({
        octokit
      })
    }
  }
}


// Default options.
const defaults: KindeProviderOptions = {

  // TODO: Enable debug logging
  debug: false
}


Object.assign(KindeProvider, { defaults })

export default KindeProvider

if ('undefined' !== typeof (module)) {
  module.exports = KindeProvider
}
