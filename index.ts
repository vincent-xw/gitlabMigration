/**
 * git仓库迁移脚本
 */

import createAndUpload from "./comp/createAndUpload";
import { readGroups } from "./comp/readRepo"
import { FromGitLabApi } from "./const/url";
// import reposData from './mock/GroupList.json';
// import fs from 'fs';

const init = async () => {
    const groupList = await readGroups(FromGitLabApi);
    // fs.writeFileSync(`./mock/GroupList.json`, JSON.stringify(groupList), {encoding: 'utf-8'})
    // const groupList = reposData;
    for (let index = 0; index < groupList.length; index++) {
        const element = groupList[index];
        for (let subIndex = 0; subIndex < element.projects.length; subIndex++) {
            const subElement = element.projects[subIndex];
            const res = await createAndUpload(subElement, element);
            console.log('res :>> ', res);
        }
    }
}
init();