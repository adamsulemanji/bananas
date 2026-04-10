import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

// NOTE: Deploy this stack to us-east-1 — ACM certs for CloudFront must be in that region
const GITHUB_OWNER = 'adamsulemanji';
const GITHUB_REPO = 'bananas';
const GITHUB_BRANCH = 'main';
const ROOT_DOMAIN = 'adamsulemanji.com';
const SUBDOMAIN = 'bananas';
const DOMAIN = `${SUBDOMAIN}.${ROOT_DOMAIN}`;

export class BananasStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', { isDefault: true });

    // ── EC2 ──────────────────────────────────────────────────────────────

    const sg = new ec2.SecurityGroup(this, 'SG', {
      vpc,
      description: 'bananas game server',
    });
    // Only open 80 — CloudFront handles HTTPS termination, no 443 on EC2 needed
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'SSH');
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'HTTP from CloudFront');

    const instanceRole = new iam.Role(this, 'InstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2RoleforAWSCodeDeploy'),
      ],
    });

    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      'curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -',
      'dnf install -y nodejs',
      'dnf install -y nginx',
      'rm -f /etc/nginx/conf.d/default.conf',
      'systemctl enable nginx',
      'systemctl start nginx',
      'npm install -g pm2',
      'env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ec2-user --hp /home/ec2-user',
      'systemctl enable pm2-ec2-user',
      'dnf install -y ruby wget',
      `wget https://aws-codedeploy-${this.region}.s3.${this.region}.amazonaws.com/latest/install -O /tmp/codedeploy-install`,
      'chmod +x /tmp/codedeploy-install',
      '/tmp/codedeploy-install auto',
      'systemctl enable codedeploy-agent',
      'systemctl start codedeploy-agent',
      'mkdir -p /home/ec2-user/app',
      'chown ec2-user:ec2-user /home/ec2-user/app',
    );

    const instance = new ec2.Instance(this, 'Instance', {
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.NANO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023({
        cpuType: ec2.AmazonLinuxCpuType.ARM_64,
      }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroup: sg,
      role: instanceRole,
      userData,
    });

    cdk.Tags.of(instance).add('App', 'bananas');

    const eip = new ec2.CfnEIP(this, 'EIP');
    new ec2.CfnEIPAssociation(this, 'EIPAssoc', {
      instanceId: instance.instanceId,
      allocationId: eip.attrAllocationId,
    });

    // ── DNS + HTTPS ───────────────────────────────────────────────────────

    // Same hosted zone your personal website already uses
    const zone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: ROOT_DOMAIN,
    });

    // ACM cert — DNS validated via the same Route53 zone, auto-renews forever
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: DOMAIN,
      validation: acm.CertificateValidation.fromDns(zone),
    });

    // ── DNS + CloudFront ──────────────────────────────────────────────────

    // CloudFront can't use a raw IP as an origin — create a DNS name for EC2 first
    const ec2Record = new route53.ARecord(this, 'EC2ARecord', {
      zone,
      recordName: `ec2.${SUBDOMAIN}`,
      target: route53.RecordTarget.fromIpAddresses(eip.ref),
    });
    const ec2Origin = `ec2.${DOMAIN}`;

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      domainNames: [DOMAIN],
      certificate,
      defaultBehavior: {
        // CloudFront talks to EC2 over plain HTTP on port 80 via DNS name
        origin: new origins.HttpOrigin(ec2Origin, {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        // ALLOW_ALL is required for WebSocket upgrade requests
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        // No caching — this is a real-time game server
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        // Forward all viewer headers (needed for Socket.io / WebSocket handshake)
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      },
    });
    // Ensure EC2 DNS record exists before CloudFront tries to use it
    distribution.node.addDependency(ec2Record);

    // bananas.adamsulemanji.com → CloudFront (same pattern as your personal site)
    new route53.ARecord(this, 'ARecord', {
      zone,
      recordName: SUBDOMAIN,
      target: route53.RecordTarget.fromAlias(
        new route53targets.CloudFrontTarget(distribution)
      ),
    });

    // ── CodeDeploy ────────────────────────────────────────────────────────

    const deployApp = new codedeploy.ServerApplication(this, 'DeployApp', {
      applicationName: 'bananas',
    });

    const deploymentGroup = new codedeploy.ServerDeploymentGroup(this, 'DeployGroup', {
      application: deployApp,
      deploymentGroupName: 'bananas-dg',
      ec2InstanceTags: new codedeploy.InstanceTagSet({ App: ['bananas'] }),
      installAgent: false,
    });

    // ── CodePipeline ──────────────────────────────────────────────────────

    const artifactBucket = new s3.Bucket(this, 'Artifacts', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const buildProject = new codebuild.PipelineProject(this, 'Builder', {
      projectName: 'bananas-build',
      buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec.yml'),
      environment: {
        buildImage: codebuild.LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_3_0,
        computeType: codebuild.ComputeType.SMALL,
        environmentVariables: {
          NEXT_PUBLIC_SOCKET_URL: { value: `https://${DOMAIN}` },
        },
      },
    });

    const sourceArtifact = new codepipeline.Artifact('Source');
    const buildArtifact = new codepipeline.Artifact('Build');

    new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: 'bananas',
      artifactBucket,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.GitHubSourceAction({
              actionName: 'GitHub',
              owner: GITHUB_OWNER,
              repo: GITHUB_REPO,
              branch: GITHUB_BRANCH,
              oauthToken: cdk.SecretValue.secretsManager('github_token2'),
              output: sourceArtifact,
              trigger: codepipeline_actions.GitHubTrigger.WEBHOOK,
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Build',
              project: buildProject,
              input: sourceArtifact,
              outputs: [buildArtifact],
            }),
          ],
        },
        {
          stageName: 'Deploy',
          actions: [
            new codepipeline_actions.CodeDeployServerDeployAction({
              actionName: 'Deploy',
              deploymentGroup,
              input: buildArtifact,
            }),
          ],
        },
      ],
    });

    // ── Outputs ───────────────────────────────────────────────────────────

    new cdk.CfnOutput(this, 'URL', {
      value: `https://${DOMAIN}`,
    });

    new cdk.CfnOutput(this, 'SSMConnect', {
      value: `aws ssm start-session --target ${instance.instanceId}`,
      description: 'Connect to EC2 without SSH keys',
    });
  }
}
