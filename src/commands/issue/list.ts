import { cli } from 'cli-ux';
import Command, { flags } from '../../base';
import { render } from '../../utils';

export const tableFlags = {
  ...cli.table.flags(),
  sort: flags.string({
    description: "property to sort by (prepend '-' for descending)",
    default: '-status',
  }),
  columns: flags.string({
    exclusive: ['extended'],
    description: 'only show provided columns (comma-separated)',
  }),
};

export default class IssueList extends Command {
  static description = 'List issues';

  static aliases = ['list', 'ls', 'l'];

  static flags = {
    ...tableFlags,
    mine: flags.boolean({ char: 'm', description: 'Only show issues assigned to me' }),
    team: flags.string({
      char: 't',
      description: 'List issues from another team',
      exclusive: ['all'],
    }),
    status: flags.string({
      char: 's',
      description: 'Only list issues with provided status',
      exclusive: ['all'],
    }),
    all: flags.boolean({ char: 'a', description: 'List issues from all teams' }),
    uncompleted: flags.boolean({
      char: 'u',
      description: 'Only show uncompleted issues',
      exclusive: ['status'],
    }),
  };

  async listAllTeamIssues() {
    const { flags } = this.parse(IssueList);
    const issues = await this.linear.getIssues();

    render.IssuesTable(issues, { flags });
  }

  async listMyIssues() {
    const { flags } = this.parse(IssueList);
    const issues = await this.linear.getMyAssignedIssues();

    render.IssuesTable(issues, { flags });
  }

  async listTeamIssues() {
    const { flags } = this.parse(IssueList);
    const teamId = flags.team ?? global.currentWorkspace.defaultTeam;
    const issues = await this.linear.getTeamIssues({
      teamId,
      first: flags.mine ? 50 : 35,
    });

    render.IssuesTable(issues, {
      flags: {
        ...flags,
        team: teamId,
      },
    });
  }

  async listIssuesWithStatus() {
    const { flags } = this.parse(IssueList);

    const cache = await this.cache.read();

    const teamId = flags.team ?? global.currentWorkspace.defaultTeam;

    const team = cache[teamId.toUpperCase()];

    if (!team) {
      this.log(`Did not find team with key ${teamId}`);
      return;
    }

    const match = team.states.find((state) =>
      state.name.toLowerCase().includes(String(flags.status).toLowerCase())
    );

    if (!match) {
      this.log(`Did not find any status with string "${flags.status}"`);
      return;
    }

    const issues = await this.linear.query.statusIssues(match?.id);

    render.IssuesTable(issues, {
      flags: {
        ...flags,
        team: teamId,
      },
    });
  }

  async run() {
    const { flags } = this.parse(IssueList);

    if (flags.status) {
      this.listIssuesWithStatus();
      return;
    }

    if (flags.mine) {
      await this.listMyIssues();
      return;
    }

    if (flags.all) {
      this.listAllTeamIssues();
      return;
    }

    this.listTeamIssues();
  }
}
