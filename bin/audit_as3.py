#!/usr/bin/env python3

import argparse
import csv
import json
import os
import subprocess
from collections import namedtuple

SourceFile = namedtuple('SourceFile', ['namespace', 'name', 'LOC'])


def get_namespace_and_filename(src_root: str, filename: str) -> (str, str):
    path, name = os.path.split(filename)
    if path.startswith('/'):
        path = path[1:]
    namespace = '.'.join(path[len(src_root):].split('/'))
    return namespace, name


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src_root')
    args = ap.parse_args()
    src_root = args.src_root
    src_root = os.path.abspath(src_root)

    print('Running cloc on {}...'.format(src_root))
    json_string = subprocess.check_output(['cloc', src_root, '--by-file', '--json'])
    results = json.loads(json_string)

    source_files = []

    for (filename, cloc_info) in results.items():
        if cloc_info.get('language') == 'ActionScript' and filename.find('unused/') < 0:
            namespace, name = get_namespace_and_filename(src_root, filename)
            source_files.append(SourceFile(namespace=namespace, name=name, LOC=cloc_info['code']))

    source_files = sorted(source_files, key=lambda x: x.namespace)

    with open('audit.csv', 'w') as csvfile:
        writer: csv.writer = csv.writer(csvfile)

        writer.writerow(['namespace', 'name', 'LOC'])
        for sf in source_files:
            writer.writerow([sf.namespace, sf.name, sf.LOC])


if __name__ == '__main__':
    main()
