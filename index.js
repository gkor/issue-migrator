const { Octokit, App, Action } = require("octokit");
const JiraApi = require("jira-client");
const delay = require('delay');

async function run() {
  //Establish API Constants
  const octokit = new Octokit({auth: "AUTH TOKEN",});
  const jira = new JiraApi({
    protocol: "https",
    host: "ATLASSIAN URL",
    username: "USERNAME",
    password: "PASSWORD",
    apiVersion: "2",
    strictSSL: true,
  });

  //Get the Jira Project Object
  const projects = await jira.listProjects();
  const project = projects.find(({ key }) => key === "YOUR PROJECT KEY"); // Jira Project Key

  //Get all Issues from Github
  const issues = await octokit.paginate("GET /repos/path/to/issues")

  //For every issue...
  issues.forEach(async function(issue) {
    //Add some latency to prevent Atlassian rate limiting
    await delay.range(2000, 60000);

    //Get Github Comments
    let comments = await octokit.paginate(`GET /repos/path/to/issues/${issue.number}/comments`);

    //Create the Jira Issue
    let jiraIssue = await jira.addNewIssue({
      fields: {
        project,
        issuetype: {
          id: "10002",
        },
        summary: issue.title,
        labels: issue.labels.map(label => {return label.name.split(' ').join('')}),
        description: `Creator: ${issue.user?.login} \n\n Assigned: ${issue.assignee?.login} \n\n ${issue.body}`,
      },
    });

    //Add a remote link back to the original Github Issue
    jira.createRemoteLink(jiraIssue.id,{object:{title:"Github Link", url: issue.html_url}});

    //For each Github Comment, add it to the Jira Issue
    comments.forEach(function(comment) {
      jira.addComment(jiraIssue.id,`${comment.body} \n\n Github Author: ${comment.user.login}`);
    });
  });

  console.log("done!");
}

run();
